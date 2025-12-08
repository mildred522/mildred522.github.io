---
title: CPP八股探索
date: 2025-11-17 18:04:00
tags:
  - CPP
  - 并发
categories:
  - 技术深入
cover: /img/p5.png
---

开宗明义，因为是服务八股的，所以不会讲的太深。

# 并发
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


# 类设计

## 1. LRU（最近最少使用）
如果只是完成对类的要求，那谁都能做到。此类类设计题，核心要求在于最大程度地优化性能。
如本例中，要求增删改查的性能都能达到O(1)。
考虑增删改均为O(1)的容器：基于双向链表实现的std::list。
而链表的查询则需要O(n)，考虑优化方案：
使用unordered_map绑定key和list迭代器，由于哈希查找的平均复杂度为O(1)，完美地完成了任务。

list的性能优势主要体现在std::splice上。

```cpp
void splice(const_iterator pos, list& src, const_iterator first, const_iterator last);
```
将 src 中 first, last 范围内的元素切下来，插到 dest 的 pos 位置之前。
只传两个参数代表移动整个链表，三个参数代表只移动单个特定元素。

```cpp
class LRUCache {
private:
    int capacity;
    list<pair<int, int>> cache_list; // pair 里面保存的是 key 和 value
    unordered_map<int, list<pair<int, int>>::iterator> key_to_iter; // key -> 链表节点迭代器

public:
    LRUCache(int capacity) : capacity(capacity) {}

    int get(int key) {
        auto umap_iter = key_to_iter.find(key);
        if (umap_iter == key_to_iter.end()) { // 没有这本书
            return -1;
        }
        auto list_iter = umap_iter->second; // 有这本书
        // 把这本书（list_iter）从书堆（cache_list）中抽出来，放到最上面（cache_list.begin()）
        cache_list.splice(cache_list.begin(), cache_list, list_iter);
        return list_iter->second; // 返回这本书的 value
    }

    void put(int key, int value) {
        auto umap_iter = key_to_iter.find(key);
        if (umap_iter != key_to_iter.end()) { // 有这本书
            auto list_iter = umap_iter->second;
            list_iter->second = value; // 更新 value
            // 把这本书（list_iter）从书堆（cache_list）中抽出来，放到最上面（cache_list.begin()）
            cache_list.splice(cache_list.begin(), cache_list, list_iter);
            return;
        }
        // 新书，放到最上面（emplace_front）
        cache_list.emplace_front(key, value);
        key_to_iter[key] = cache_list.begin();
        // 书太多了
        if (key_to_iter.size() > capacity) {
            // 去掉最后一本书
            key_to_iter.erase(cache_list.back().first);
            cache_list.pop_back();
        }
    }
};
（作者：灵茶山艾府）

```

在实际考察中，常要求手写双向链表：

```cpp
struct Node {
    int key;
    int value;
    Node* prev;
    Node* next;

    Node(int k = 0, int v = 0) : key(k), value(v) {}
};

class LRUCache {
private:
    int capacity;
    Node* dummy; // 哨兵节点
    unordered_map<int, Node*> key_to_node;

    // 删除一个节点（抽出一本书）
    void remove(Node* x) {
        x->prev->next = x->next;
        x->next->prev = x->prev;
    }

    // 在链表头添加一个节点（把一本书放到最上面）
    void push_front(Node* x) {
        x->prev = dummy;
        x->next = dummy->next;
        x->prev->next = x;
        x->next->prev = x;
    }

    // 获取 key 对应的节点，同时把该节点移到链表头部
    Node* get_node(int key) {
        auto it = key_to_node.find(key);
        if (it == key_to_node.end()) { // 没有这本书
            return nullptr;
        }
        Node* node = it->second; // 有这本书
        remove(node); // 把这本书抽出来
        push_front(node); // 放到最上面
        return node;
    }

public:
    LRUCache(int capacity) : capacity(capacity), dummy(new Node()) {
        dummy->prev = dummy;
        dummy->next = dummy;
    }

    int get(int key) {
        Node* node = get_node(key); // get_node 会把对应节点移到链表头部
        return node ? node->value : -1;
    }

    void put(int key, int value) {
        Node* node = get_node(key); // get_node 会把对应节点移到链表头部
        if (node) { // 有这本书
            node->value = value; // 更新 value
            return;
        }
        key_to_node[key] = node = new Node(key, value); // 新书
        push_front(node); // 放到最上面
        if (key_to_node.size() > capacity) { // 书太多了
            Node* back_node = dummy->prev;
            key_to_node.erase(back_node->key);
            remove(back_node); // 去掉最后一本书
            delete back_node; // 释放内存
        }
    }
};
```

这里将dummy哨兵节点初始化为一个闭环，每次push_front加入元素的时候都会在环上添加一个节点，从而使头节点和尾节点始终能被访问，实现双向链表。

## 2.跳表(skiplist)
跳表常见于与红黑树类似但对并发要求较高的场景，能够提供Ologn的增删改查时间复杂度（但跳表在最劣情况下会退化到On）（空间复杂度为On）。
跳表的结构为一个head节点，head节点持有有MAX_LEVEL条链表。

<div style="text-align: center;">
    <img src="/img/skiplist.png" alt="跳表示意图" style="width: auto; height: auto;">
</div>

如图所示为跳表的基本结构，```head->forward[i]```表示在第i层的第一个节点， ```head->forward[i]->forward[i]```则表示在第i层的第二个节点，以此类推。
需要注意的是，尽管在示意图中一个节点可能在不同的level中同时出现，但他们实际仅占用一份内存，图示的含义为，从不同层的某个前驱节点都可以访问到该节点。

单个节点的结构为：
```cpp
struct ListNode {
    int value;
    // forward[i] 表示该节点在第 i 层的下一个节点
    // 数组大小在 new 节点时根据随机出的 level 确定
    vector<ListNode*> forward; 
    
    ListNode(int v, int level) : value(v), forward(level, nullptr) {}
};
```

在插入一个节点时，先利用一个随机函数确定层高，然后从最高层往下遍历。
我们可以在每一层利用之前的层数中获取的信息（从高层到底层），表现为在不同层数中通用的语句```cur = cur->forward[i]```。因此插入所进行的总迭代次数为常数，而总层数为logn，总体复杂度为Ologn。其余操作原理类似。

以下为一个基本的跳表实现：
```cpp
static const int MAX_LEVEL = 24;
// 虽然是单机的，但我们要实现默认的线程安全

class Skiplist {
    struct ListNode {
        int value;
        vector<ListNode*> forward;

        ListNode(int v, int level) : value(v), forward(level, nullptr) {};
    };

public:
    Skiplist() { srand(time(nullptr)); }

    bool search(int target) {
        ListNode* cur = head;

        for (int i = cur_level - 1; i >= 0; i--) {

            while (cur->forward[i] != nullptr &&
                   cur->forward[i]->value < target) {
                cur = cur->forward[i];
            }
        }
        if (cur->forward[0] != nullptr && cur->forward[0]->value == target) {
            return true;
        }
        return false;
    }

    void add(int num) {
        int level = randlevel(); // 插入节点的层高
        ListNode* update[MAX_LEVEL];

        if (level > cur_level) {
            cur_level = level;
        }

        ListNode* tar = new ListNode(num, level);

        ListNode* cur = head;
        for (int i = cur_level - 1; i >= 0; i--) {

            while (cur->forward[i] != nullptr && cur->forward[i]->value < num) {
                cur = cur->forward[i];
            }

            update[i] = cur; // 在每层中找到该元素的前驱节点
        }

        // 实际插入节点
        for (int i = 0; i < level; i++) {
            tar->forward[i] = update[i]->forward[i];
            update[i]->forward[i] = tar;
        }
    }

    bool erase(int num) {
        ListNode* update[MAX_LEVEL];
        ListNode* cur = head;

        for (int i = cur_level - 1; i >= 0; i--) {

            while (cur->forward[i] != nullptr && cur->forward[i]->value < num) {
                cur = cur->forward[i];
            }
           
            update[i] = cur; // 在每层中找到该元素的前驱节点
            
        }

        ListNode* target = cur->forward[0];

        if (target == nullptr || target->value != num) {
            return false;
        }
        
        for (int i = 0; i < cur_level; i++) {
            if (update[i]->forward[i] != target) {
                break;
            }

            update[i]->forward[i] = target->forward[i];
        }

        delete target;

        while (cur_level > 0 && head->forward[cur_level - 1] == nullptr) {
            cur_level--;
        }

        return true;
    }

private:
    ListNode* head = new ListNode(-1, MAX_LEVEL);
    int cur_level;

    int randlevel() {
        static const float P = 0.25;

        int level = 1;

        // rand出来的随机数/RAND_MAX
        // 为0到1之间的float类型，只要该随机数小于P，则认为事件发生
        while (((float)rand() / RAND_MAX) < P && level < MAX_LEVEL) {
            level++;
        }

        return level;
    }
};
```
