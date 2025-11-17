---
title: CPP并发八股探索
date: 2025-11-17 18:04:00
tags:
  - CPP
  - 并发
categories:
  - 技术深入
cover: /img/p5.png
---

开宗明义，因为是服务八股的，所以不会讲的太深。
实际上，并发这块知识就是很容易忘却，因为各个语言处理并发的标准不同，CPP自己内部甚至也做不到步调统一。
如果对互斥锁变量，互斥体，锁包装器，线程启动方式等概念还不了解，请先查阅相关基础概念。

下文我们先以std::thread为例来讲解。

## 1.交替输出

```cpp
void func(int flag) {
    std::unique_lock<std::mutex> lk(mx);
    for(int i = 0; i < 1000; i++) {
        a += 1;
        std::cout  << "thread " << flag << " 's a : " << a << std::endl; 
    }
    
}
```

<div style="text-align: center;">
    <img src="/img/th1.1.png"  style="width: auto; height: auto;">
</div>

<div style="text-align: center;">
    <img src="/img/th1.2.png"  style="width: auto; height: auto;">
</div>

编写一个持有unique_lock的，使全局变量递增1000次的函数，可以观察到，OS的调度会随机选择一个线程，此线程开始工作后持续持有该锁直到工作结束自动释放。

如果我们要实现交替输出，就要在每次递增时释放锁。

```cpp
void func(int flag) {
    for(int i = 0; i < 1000; i++) {
        std::unique_lock<std::mutex> lk(mx);
        a += 1;
        std::cout  << "thread " << flag << " 's a : " << a << std::endl; 
        lk.unlock(); // 这里不写也可以    
    }
    
}
```

<div style="text-align: center;">
    <img src="/img/th1.3.png"  style="width: auto; height: auto;">
</div>

观察到，释放锁后，虽然实现了轮流输出，但并没有按照次序严格交替，这是由于我们无法控制OS的调度顺序。
因此就需要引入信号量的机制。使用条件变量，这里的核心思想是，使一个线程完成当前工作后主动陷入休眠，这样就不会与另一个线程加入调度的竞争中了。
因为起始的cur被设置为0，所以这里总是线程0先启动。

```cpp
void func(int flag) {
    for(int i = 0; i < 1000; i++) {
        std::unique_lock<std::mutex> lk(mx);

        cv.wait(lk, [&]{ return cur == flag;});
        
        // 临界区
        a += 1;
        std::cout << "thread " << flag << " 's a : " << a << std::endl; 
        // 临界区结束

        cur = 1 - cur; // 这里的1要和线程flag对应
        cv.notify_one();
    }
    
}
```

<div style="text-align: center;">
    <img src="/img/th1.4.png"  style="width: auto; height: auto;">
</div>

如果想要三者交替，此时引入第三个线程，notify_one就会重新引入os的随机性，所以需要采用notify_all。
notify_one只适用于线程被唤醒的条件相同的情况下，这样从外部来观察，所有线程都是等价的，所以随机唤醒的操作也是等价的。
notify_all则适用于线程被唤醒的条件不同的情况，如本例中cur=0,cur=1,cur=2。
之所以只有两个线程时one也适用，是因为随机的选择只有另一个线程。

```cpp
void func(int flag) {
    for(int i = 0; i < 1000; i++) {
        std::unique_lock<std::mutex> lk(mx);

        cv.wait(lk, [&]{ return cur == flag;});
        
        // 临界区
        a += 1;
        std::cout << "thread " << flag << " 's a : " << a << std::endl; 
        // 临界区结束

        cur = (cur == 2 ? cur = 0 : cur + 1);
        cv.notify_all();
    }
    
}
```

<div style="text-align: center;">
    <img src="/img/th1.5.png"  style="width: auto; height: auto;">
</div>


总结：条件变量在互斥锁的基础上使用，.wait()可以使指定线程陷入休眠状态，, .notify_one()或.notify_all()可以唤醒特定线程，线程唤醒后就会重新竞争互斥锁。

## 2.并发安全容器

### 并发安全的循环队列/生产者-消费者模型

```cpp
void enque(int n) {
        std::unique_lock<std::mutex> lk(mx);
        
        producer_cv.wait(lk, [&]{ return is_full() == false; });

        vv[end] = n;
        end = (end + 1) % cnt;

        consumer_cv.notify_one();
    }

int deque() {
    std::unique_lock<std::mutex> lk(mx);
    
    consumer_cv.wait(lk, [&]{ return is_empty() == false; });
    int re = vv[head];
    vv[head] = 0;
    head = (head + 1) % cnt;

    producer_cv.notify_one();

    return re;
}
```
循环队列实现略。
我们通过两个cv和一个mx来实现此场景。
入队线程承担生产者的工作。在此线程中，会先阻塞直到循环队列不为满，然后完成入队任务，最后通知一个消费者来进行竞争。出队线程同理。
所有生产者服从于同一个条件变量的指挥，那是因为它们要竞争完成等价的入队任务。