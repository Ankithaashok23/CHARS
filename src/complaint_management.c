#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX 100
#define TABLE_SIZE 50

typedef struct Complaint {
    int id;
    char user[30];
    char studentType[15];
    char category[30];
    int severity;
    int votes;
    int priorityScore;
    char priority[10];
    char status[20];
} Complaint;

/* Hash Table */
Complaint* table[TABLE_SIZE];

int hash(int id) {
    return id % TABLE_SIZE;
}

void insertHash(Complaint* c) {
    table[hash(c->id)] = c;
}

Complaint* searchHash(int id) {
    return table[hash(id)];
}

/* Priority Queue (Max Heap) */
Complaint* heap[MAX];
int size = 0;

void swap(int i, int j) {
    Complaint* t = heap[i];
    heap[i] = heap[j];
    heap[j] = t;
}

void heapifyUp(int i) {
    while (i > 0 && heap[i]->priorityScore > heap[(i-1)/2]->priorityScore) {
        swap(i, (i-1)/2);
        i = (i-1)/2;
    }
}

void heapifyDown(int i) {
    int largest = i;
    int l = 2*i+1, r = 2*i+2;

    if (l < size && heap[l]->priorityScore > heap[largest]->priorityScore)
        largest = l;
    if (r < size && heap[r]->priorityScore > heap[largest]->priorityScore)
        largest = r;

    if (largest != i) {
        swap(i, largest);
        heapifyDown(largest);
    }
}

void insertPQ(Complaint* c) {
    heap[size] = c;
    heapifyUp(size++);
}

Complaint* extractPQ() {
    if (size == 0) return NULL;
    Complaint* top = heap[0];
    heap[0] = heap[--size];
    heapifyDown(0);
    return top;
}

/* Stack */
Complaint* stack[MAX];
int top = -1;

void push(Complaint* c) { stack[++top] = c; }
Complaint* pop() { return (top == -1) ? NULL : stack[top--]; }

/* Priority Assignment */
void assignPriority(Complaint* c) {
    c->priorityScore = c->severity + c->votes;
    if (c->priorityScore <= 3) strcpy(c->priority, "Low");
    else if (c->priorityScore <= 6) strcpy(c->priority, "Medium");
    else strcpy(c->priority, "High");
}

/* Operations */
void raiseComplaint() {
    Complaint* c = malloc(sizeof(Complaint));

    printf("ID: "); scanf("%d", &c->id);
    printf("Name: "); scanf("%s", c->user);
    printf("Student Type (Day/Hostel): "); scanf("%s", c->studentType);
    printf("Category: "); scanf("%s", c->category);
    printf("Severity (1-5): "); scanf("%d", &c->severity);

    c->votes = 0;
    strcpy(c->status, "Submitted");

    assignPriority(c);
    insertHash(c);
    insertPQ(c);

    printf("Complaint Submitted | Priority: %s\n", c->priority);
}

void voteComplaint() {
    int id;
    printf("Complaint ID: "); scanf("%d", &id);
    Complaint* c = searchHash(id);

    if (!c) { printf("Not found\n"); return; }

    c->votes++;
    assignPriority(c);
    insertPQ(c);

    printf("Vote Added | Priority: %s\n", c->priority);
}

void resolveComplaint() {
    Complaint* c = extractPQ();
    if (!c) { printf("No pending complaints\n"); return; }
    strcpy(c->status, "Resolved");
    printf("Resolved ID %d | Priority %s\n", c->id, c->priority);
}

void withdrawComplaint() {
    int id;
    printf("Complaint ID: "); scanf("%d", &id);
    Complaint* c = searchHash(id);
    if (c) {
        strcpy(c->status, "Withdrawn");
        push(c);
        printf("Complaint Withdrawn\n");
    }
}

void undoWithdraw() {
    Complaint* c = pop();
    if (c) {
        strcpy(c->status, "Reopened");
        insertPQ(c);
        printf("Undo Successful\n");
    }
}

int main() {
    int ch;
    while (1) {
        printf("\n1.Raise 2.Vote 3.Resolve 4.Withdraw 5.Undo 6.Exit\nChoice: ");
        scanf("%d", &ch);

        switch (ch) {
            case 1: raiseComplaint(); break;
            case 2: voteComplaint(); break;
            case 3: resolveComplaint(); break;
            case 4: withdrawComplaint(); break;
            case 5: undoWithdraw(); break;
            case 6: exit(0);
            default: printf("Invalid\n");
        }
    }
}
