// Universal Knowledge Service providing encyclopedic and BCA academic knowledge
// Used as high-reliability offline/open knowledge fallback and for validating core curriculum answers

export interface UniversalAnswer {
  title: string
  summary: string
  spokenText: string
  codeSnippet?: string
  codeLanguage?: string
  source: 'bca-curated' | 'wikipedia' | 'local-encyclopedia'
}

export interface BcaConcept {
  id: string
  title: string
  matchPatterns: RegExp[]
  spokenText: string
  summary: string
  codeSnippet?: string
  codeLanguage?: string
}

export const BCA_CURRICULUM_KNOWLEDGE: BcaConcept[] = [
  {
    id: 'array-vs-linked-list',
    title: 'Difference Between Array and Linked List',
    matchPatterns: [
      /\b(difference|compare|versus|vs)\b.*\b(array|arrays)\b.*\b(linked\s*list|linkedlist)\b/i,
      /\b(difference|compare|versus|vs)\b.*\b(linked\s*list|linkedlist)\b.*\b(array|arrays)\b/i,
      /\b(array|arrays)\b.*\b(linked\s*list|linkedlist)\b.*\b(difference|differences|compare)\b/i,
    ],
    spokenText:
      'The key difference between an array and a linked list lies in memory layout and flexibility. An array stores elements in contiguous memory locations with a fixed size, allowing fast constant time index access O(1), but insertions and deletions take linear time O(n). A linked list stores elements across non-contiguous nodes connected by pointers. It offers dynamic sizing and efficient constant time insertions and deletions at known positions, but requires sequential traversal O(n) to access elements and consumes extra memory for pointers.',
    summary:
      '1. Memory Layout: Arrays use contiguous memory; Linked Lists use scattered nodes with pointers.\n2. Size: Arrays have fixed size; Linked Lists are dynamic.\n3. Access Time: Arrays support O(1) random index access; Linked Lists require O(n) sequential access.\n4. Insertion/Deletion: Arrays require shifting elements O(n); Linked Lists only update pointers O(1) when position is known.\n5. Memory Overhead: Arrays have minimal overhead; Linked Lists require extra storage for address pointers.',
  },
  {
    id: 'c-even-odd-program',
    title: 'C Program to Check Even or Odd Number',
    matchPatterns: [
      /\b(c\s+program|program\s+in\s+c|code\s+in\s+c)\b.*\b(even\s+or\s+odd|even\s+and\s+odd|check.*even|odd.*even)\b/i,
      /\b(check|determine|find)\b.*\b(whether\s+a\s+number\s+is\s+even\s+or\s+odd|number\s+is\s+even\s+or\s+odd)\b/i,
      /\b(even\s+or\s+odd)\b.*\b(c\s+program|c\s+code|in\s+c)\b/i,
    ],
    codeSnippet: `#include <stdio.h>

int main() {
    int num;
    printf("Enter an integer: ");
    if (scanf("%d", &num) != 1) {
        printf("Invalid input\\n");
        return 1;
    }

    if (num % 2 == 0) {
        printf("%d is even.\\n", num);
    } else {
        printf("%d is odd.\\n", num);
    }

    return 0;
}`,
    spokenText:
      'Here is the C program to check whether a number is even or odd. In C, you use the modulo operator percent to find the remainder when dividing by 2. If number modulo 2 equals zero, the number is even; otherwise, it is odd. The program includes standard input output header stdio dot h, declares an integer num, reads input with scan f, checks the condition using an if statement, and prints the result with print f.',
    summary:
      'A C program checks whether a number is even or odd using the modulo operator (%):\n\n```c\n#include <stdio.h>\n\nint main() {\n    int num;\n    printf("Enter an integer: ");\n    if (scanf("%d", &num) != 1) {\n        printf("Invalid input\\n");\n        return 1;\n    }\n\n    if (num % 2 == 0) {\n        printf("%d is even.\\n", num);\n    } else {\n        printf("%d is odd.\\n", num);\n    }\n\n    return 0;\n}\n```\nLogic: If num % 2 equals 0, the number is divisible by 2 with no remainder, so it is even. Otherwise, it is odd.',
  },
  {
    id: 'binary-search-sorted-requirement',
    title: 'Why Binary Search Requires a Sorted Array',
    matchPatterns: [
      /\b(binary\s*search)\b.*\b(require|need|must\s+be|order|sorted)\b.*\b(sorted|array|order)\b/i,
      /\bwhy\s+does\s+binary\s*search\b.*\b(sorted|array)\b/i,
      /\bwhy\s+binary\s*search\b.*\b(need|require|sorted)\b/i,
    ],
    spokenText:
      'Binary search requires a sorted array because it relies on the divide and conquer principle. At each step, it compares the target value to the middle element. Because the elements are sorted in order, if the target is smaller than the middle element, it is guaranteed to be in the left half; if greater, it is guaranteed to be in the right half. This allows the algorithm to safely eliminate half of the remaining elements in each step, achieving logarithmic O(log n) time. In an unsorted array, you cannot know which side contains the target based on a middle comparison, making binary elimination impossible.',
    summary:
      'Binary search requires a sorted array because:\n1. Divide and Conquer: It compares the search key with the middle element.\n2. Predictable Order: Sorted order guarantees all smaller values are to the left and all larger values are to the right.\n3. Eliminating Half the Space: This guarantee enables discarding half the remaining array on every comparison, giving O(log n) efficiency.\n4. Failure without Sorting: In an unsorted array, comparing against the middle gives no directional information, forcing linear scan O(n).',
  },
  {
    id: 'for-loop-step-by-step',
    title: 'How a For Loop Works Step by Step',
    matchPatterns: [
      /\b(how\s+(a\s+)?for\s+loop\s+works?|explain\s+how\s+(a\s+)?for\s+loop\s+works?)\b/i,
      /\bfor\s+loop\b.*\b(step\s+by\s+step|one\s+step\s+at\s+a\s+time|steps?|working)\b/i,
      /\bhow\s+does\s+a\s+for\s+loop\s+work\b/i,
    ],
    spokenText:
      'A for loop executes in four clear sequential steps. Step 1 is Initialization, where the loop counter variable is created and assigned a starting value. This happens only once. Step 2 is Condition Evaluation, where the loop condition is tested. If true, execution continues; if false, the loop terminates immediately. Step 3 is Body Execution, where the statements inside the loop block are carried out. Step 4 is Increment or Update, where the counter variable is updated, and control jumps back to Step 2 to test the condition again.',
    summary:
      'How a For Loop Works Step by Step:\n1. Step 1: Initialization — The loop control variable is initialized (e.g. int i = 0). Executes exactly once at the beginning.\n2. Step 2: Condition Evaluation — The loop test expression (e.g. i < 10) is checked. If true, control enters the loop body. If false, the loop ends.\n3. Step 3: Body Execution — The code statements inside the loop block are executed.\n4. Step 4: Iteration / Update — The loop counter is modified (e.g. i++). Control immediately returns to Step 2 to re-evaluate the condition.',
  },
  {
    id: 'python-inheritance-example',
    title: 'Inheritance in Python with Code Example',
    matchPatterns: [
      /\binheritance\b.*\bpython\b/i,
      /\bpython\b.*\binheritance\b/i,
    ],
    codeLanguage: 'python',
    codeSnippet: `# Parent / Base class
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return f"{self.name} makes a sound."

# Child / Derived class inheriting from Animal
class Dog(Animal):
    def __init__(self, name, breed):
        # Call parent constructor
        super().__init__(name)
        self.breed = breed

    # Method overriding
    def speak(self):
        return f"{self.name} the {self.breed} barks!"

# Create an instance of the child class
my_dog = Dog("Buddy", "Golden Retriever")
print(my_dog.speak())  # Output: Buddy the Golden Retriever barks!`,
    spokenText:
      'In Python, inheritance allows a child class to inherit attributes and methods from a parent class, enabling code reuse. In our example, Animal is the parent class with a constructor init that accepts a name, and a speak method. Dog is the child class, defined as class Dog parentheses Animal, indicating it inherits from Animal. In Dog dot init, we use super dot init to call the parent constructor to set the name, and add a breed attribute. Dog overrides the speak method to return a barking message. When we instantiate Dog with Buddy and Golden Retriever, Buddy has access to both inherited and specialized properties.',
    summary:
      'Inheritance in Python:\n\nSyntax: `class DerivedClass(BaseClass):`\n- `super().__init__()`: Calls the base class constructor.\n- Method Overriding: Child class replaces a parent method with specialized logic.\n\n```python\nclass Animal:\n    def __init__(self, name):\n        self.name = name\n    def speak(self):\n        return f"{self.name} makes a sound."\n\nclass Dog(Animal):\n    def __init__(self, name, breed):\n        super().__init__(name)\n        self.breed = breed\n    def speak(self):\n        return f"{self.name} the {self.breed} barks!"\n```',
  },
  {
    id: 'inheritance-simplified',
    title: 'Inheritance Explained in Simpler Language',
    matchPatterns: [
      /\b(simpler\s+language|simpler\s+terms|simple\s+words|simplify)\b.*\b(inheritance|previous\s+answer|earlier\s+answer|concept)\b/i,
      /\bexplain\s+(the\s+)?previous\s+answer\s+in\s+simpler\s+language\b/i,
      /\bexplain\s+(that\s+)?more\s+simply\b/i,
    ],
    spokenText:
      'To put it simply, think of inheritance just like children inheriting physical traits from their parents, like eye color or height. In programming, instead of writing the same code over and over again for every new item, you create a general parent blueprint, like Animal, with basic features like a name and ability to speak. Then, any specific child blueprint, like Dog, automatically gets all of those features for free and only adds what is special, like barking and having a breed. This saves time and keeps code clean.',
    summary:
      'Inheritance in Simpler Language:\n\nThink of inheritance like a family recipe or DNA:\n1. Parent Class: Has general ingredients that all recipes share.\n2. Child Class: Inherits the whole base recipe automatically and just adds its own special topping.\nWhy use it? You write the common code once, and all derived objects can use it immediately without rewriting.',
  },
  {
    id: 'inheritance-real-life-example',
    title: 'Real-Life Example of Inheritance in OOP',
    matchPatterns: [
      /\b(real\s*life\s*example|everyday\s*example|practical\s*example)\b.*\b(of\s+it|inheritance|oop)\b/i,
      /\bexample\b.*\b(of\s+it|inheritance)\b/i,
      /\binheritance\b.*\b(real\s*life|real\s*world|example)\b/i,
    ],
    spokenText:
      'A great real-life example of inheritance is the relationship between a Vehicle and a Car. Vehicle is the parent base class. It defines common properties that all vehicles have, such as manufacturer, speed, and fuel capacity, along with methods like start and brake. Car is the child derived class. It inherits all of those attributes and methods from Vehicle without having to rewrite them, and adds its own specific features, such as number of doors, air conditioning, and a trunk capacity. Another common example is Person and Student, where Student inherits name and age from Person, but adds a student roll number and enrolled course.',
    summary:
      'Real-Life Example of Inheritance in OOP:\n- Parent (Base) Class: Vehicle\n  • Attributes: brand, model, speed, fuelType\n  • Methods: startEngine(), applyBrakes()\n- Child (Derived) Class: Car inherits from Vehicle\n  • Inherited: brand, model, speed, startEngine()\n  • Added Specialized Attributes: numberOfDoors, hasAirConditioning, trunkSize\n  • Added Methods: openTrunk()\nWhy it matters: The Car class reuses all code from Vehicle and only adds what is unique, demonstrating clean code reusability and an "is-a" relationship (Car is a Vehicle).',
  },
  {
    id: 'inheritance-concept-oop',
    title: 'Inheritance in Object-Oriented Programming',
    matchPatterns: [
      /\b(what\s+is|explain|describe|define)\s+(inheritance|oop\s+inheritance)\b/i,
      /\binheritance\s+in\s+oop\b/i,
      /\bconcept\s+of\s+inheritance\b/i,
    ],
    spokenText:
      'Inheritance is a fundamental concept in Object-Oriented Programming where a new class, called the child or derived class, automatically acquires the properties and behaviors of an existing class, called the parent or base class. This establishes an "is-a" relationship, facilitates modular design, and eliminates code duplication through code reusability.',
    summary:
      'Inheritance in OOP allows a child class to inherit fields and methods from a parent class.\nKey points:\n1. Base (Parent) Class: The class whose properties are inherited.\n2. Derived (Child) Class: The class that inherits and extends the base class.\n3. Benefits: Reusability of code, extensibility, and support for polymorphism through method overriding.\n4. Types of Inheritance: Single, Multiple (supported in C++ and Python, via interfaces in Java), Multilevel, Hierarchical, and Hybrid.',
  },
  {
    id: 'osi-model',
    title: 'OSI Model (Open Systems Interconnection)',
    matchPatterns: [
      /\b(osi\s*model|osi\s*layers?|7\s*layers\s*of\s*osi|open\s*systems\s*interconnection)\b/i,
      /\bexplain\b.*\b(osi)\b/i,
    ],
    spokenText:
      'The OSI model, or Open Systems Interconnection model, is a 7-layer architectural framework that standardizes how data communicates across computer networks. From bottom to top, the seven layers are: Layer 1 Physical, transmitting raw bits over cables or radio; Layer 2 Data Link, handling node to node frame transmission and MAC addresses; Layer 3 Network, routing packets using IP addresses; Layer 4 Transport, managing reliable end to end delivery with protocols like TCP and UDP; Layer 5 Session, establishing and managing dialogues between applications; Layer 6 Presentation, translating, encrypting, and formatting data; and Layer 7 Application, providing network services directly to user applications such as web browsers with HTTP.',
    summary:
      'The OSI (Open Systems Interconnection) Model has 7 Layers (remember as "All People Seem To Need Data Processing" from top to bottom, or "Please Do Not Throw Sausage Pizza Away" from bottom to top):\n1. Layer 1 — Physical: Electrical signals, cables, bits (e.g. Ethernet cables, repeaters).\n2. Layer 2 — Data Link: Framing, MAC addressing, error detection (e.g. Switches, Bridges).\n3. Layer 3 — Network: Logical addressing, packet routing (e.g. IP, Routers).\n4. Layer 4 — Transport: End-to-end data transfer, segmentation, reliability (e.g. TCP, UDP).\n5. Layer 5 — Session: Connection establishment, session management (e.g. NetBIOS, RPC).\n6. Layer 6 — Presentation: Data syntax, compression, encryption (e.g. SSL/TLS, JPEG, ASCII).\n7. Layer 7 — Application: Network services for user applications (e.g. HTTP, DNS, SMTP, FTP).',
  },
  {
    id: 'bca-unknown-response-policy',
    title: 'Assistant Policy for Unknown BCA Questions',
    matchPatterns: [
      /\b(if\s+you\s+(do\s+not|don't)\s+know\b.*\b(answer|respond|bca)\b)/i,
      /\bhow\s+should\s+you\s+respond\s+if\s+you\s+(do\s+not|don't)\s+know\b/i,
      /\bwhat\s+(do|would)\s+you\s+do\s+if\s+you\s+don't\s+know\b/i,
      /\bresponse\s+when\s+answer\s+is\s+unknown\b/i,
    ],
    spokenText:
      'If I do not know the answer to a BCA question, I will honestly state that I do not know or do not have enough verified information to answer accurately, rather than inventing or guessing facts. I will also recommend consulting your course syllabus, prescribed BCA textbook, or instructor for verified guidance.',
    summary:
      'Assistant Transparency & Uncertainty Policy:\n1. Admitting Limits: The assistant must clearly acknowledge when it does not know or lacks sufficient context to answer a student question.\n2. No Hallucination: The assistant strictly avoids guessing or fabricating academic facts.\n3. Constructive Guidance: The assistant directs the student to reliable sources, such as course textbooks, faculty instructors, or official syllabus modules.',
  },
  {
    id: 'stack-vs-queue',
    title: 'Difference Between Stack and Queue',
    matchPatterns: [
      /\b(difference|compare|versus|vs)\b.*\bstack\b.*\bqueue\b/i,
      /\b(difference|compare|versus|vs)\b.*\bqueue\b.*\bstack\b/i,
      /\bstack\s+and\s+queue\b.*\b(difference|differences|compare)\b/i,
    ],
    spokenText:
      'The primary difference between a stack and a queue is their access order. A stack is a LIFO data structure, meaning Last In, First Out. Elements are added and removed from the same end, called the top, using push and pop operations. A queue is a FIFO data structure, meaning First In, First Out. Elements are inserted at the rear and removed from the front, using enqueue and dequeue operations.',
    summary:
      '1. Order: Stack is LIFO (Last In First Out); Queue is FIFO (First In First Out).\n2. Ends: Stack has one active end (Top); Queue has two ends (Front for deletion, Rear for insertion).\n3. Operations: Stack uses push() and pop(); Queue uses enqueue() and dequeue().\n4. Real Example: Stack of plates vs Queue at a ticket counter.',
  },
  {
    id: 'oop-pillars',
    title: 'Four Pillars of Object-Oriented Programming',
    matchPatterns: [
      /\b(four|4)\s+pillars\s+of\s+oop\b/i,
      /\bmain\s+concepts\s+of\s+oop\b/i,
      /\boop\s+principles\b/i,
    ],
    spokenText:
      'The four pillars of Object-Oriented Programming are Encapsulation, Abstraction, Inheritance, and Polymorphism. Encapsulation bundles data and methods into a single unit while restricting direct access. Abstraction hides internal implementation details and shows only essential functionality. Inheritance allows a new class to acquire properties from an existing parent class. Polymorphism allows methods to take on different forms, enabling the same interface to perform different actions.',
    summary:
      'The Four Pillars of OOP:\n1. Encapsulation: Binding data and methods together inside a class; protecting internal state using access modifiers (private, protected, public).\n2. Abstraction: Hiding internal complexity and exposing only necessary features to the user (via abstract classes and interfaces).\n3. Inheritance: Deriving new classes from existing classes to achieve code reuse and hierarchical organization.\n4. Polymorphism: "Many forms"; the ability of a method or object to behave differently based on context (Compile-time overloading, Runtime overriding).',
  },
  {
    id: 'dbms-acid-properties',
    title: 'ACID Properties in DBMS',
    matchPatterns: [
      /\bacid\s+properties\b/i,
      /\bwhat\s+is\s+acid\s+in\s+dbms\b/i,
      /\bacid\s+in\s+database\b/i,
    ],
    spokenText:
      'ACID represents the four essential properties that guarantee reliable transaction processing in database systems. Atomicity ensures all operations in a transaction succeed completely or none are applied. Consistency ensures the database transitions from one valid state to another, maintaining all integrity constraints. Isolation ensures concurrent transactions execute without interfering with one another. Durability ensures once a transaction is committed, its changes survive even system crashes.',
    summary:
      'ACID Properties in Database Management Systems:\n- A — Atomicity: All or nothing transaction execution.\n- C — Consistency: Database remains legally consistent before and after transaction.\n- I — Isolation: Intermediate transaction states are invisible to concurrent transactions.\n- D — Durability: Committed updates are permanently recorded in non-volatile storage.',
  },
  {
    id: 'dbms-normalization',
    title: 'Database Normalization',
    matchPatterns: [
      /\bnormalization\s+in\s+dbms\b/i,
      /\bwhat\s+is\s+normalization\b/i,
      /\b1nf\s+2nf\s+3nf\b/i,
    ],
    spokenText:
      'Normalization in DBMS is the process of organizing database tables to minimize data redundancy and prevent insertion, update, and deletion anomalies. The standard normal forms are First Normal Form, requiring atomic single values; Second Normal Form, eliminating partial dependencies on a composite primary key; and Third Normal Form, eliminating transitive dependencies between non-key attributes.',
    summary:
      'Database Normalization:\n1. Purpose: Reduce data duplication and avoid insertion, update, and deletion anomalies.\n2. 1NF (First Normal Form): Eliminate duplicate columns and ensure all attribute values are atomic.\n3. 2NF (Second Normal Form): Must be in 1NF and have no partial dependency (all non-key attributes depend fully on the primary key).\n4. 3NF (Third Normal Form): Must be in 2NF and have no transitive dependencies (no non-key attribute depends on another non-key attribute).',
  },
  {
    id: 'os-process-vs-thread',
    title: 'Difference Between Process and Thread',
    matchPatterns: [
      /\b(difference|compare|versus|vs)\b.*\bprocess\b.*\bthread\b/i,
      /\b(difference|compare|versus|vs)\b.*\bthread\b.*\bprocess\b/i,
      /\bprocess\s+and\s+thread\b.*\b(difference|differences)\b/i,
    ],
    spokenText:
      'A process is an independent program in execution with its own dedicated memory address space, allocated resources, and security context. A thread is the smallest unit of execution within a process, often called a lightweight process. Multiple threads within the same process share that process memory, code segment, and file descriptors, allowing faster context switching and inter-thread communication, but sharing the risk that if one thread crashes the whole process may fail.',
    summary:
      '1. Memory: A process has separate memory space; threads share the memory of their parent process.\n2. Overhead: Creating and switching processes is heavyweight; thread operations are lightweight.\n3. Communication: Processes communicate via Inter-Process Communication (IPC); threads communicate directly via shared memory.\n4. Independence: Processes are isolated; if one thread terminates improperly, it can crash other threads.',
  },
  {
    id: 'software-development-life-cycle',
    title: 'Software Development Life Cycle (SDLC)',
    matchPatterns: [
      /\b(what\s+is\s+sdlc|sdlc\b|software\s+development\s+life\s*cycle)\b/i,
      /\bphases\s+of\s+sdlc\b/i,
    ],
    spokenText:
      'The Software Development Life Cycle, or SDLC, is a structured step-by-step methodology used by software teams to design, develop, test, and maintain high-quality software. The core SDLC phases are: 1. Requirement Analysis, gathering user needs; 2. System Design, defining overall architecture and specifications; 3. Implementation or Coding, writing the actual source code; 4. Testing, identifying and resolving bugs; 5. Deployment, releasing the product to users; and 6. Maintenance, fixing issues and adding enhancements over time.',
    summary:
      'Software Development Life Cycle (SDLC) is a systematic process for building software:\n1. Requirement Gathering & Analysis: Define what the software must accomplish.\n2. System Design: Plan architectural blueprints, database schemas, and workflows.\n3. Implementation (Coding): Develop executable code in programming languages.\n4. Testing: Verify functional, performance, and security requirements.\n5. Deployment: Release software into staging and production environments.\n6. Maintenance: Provide ongoing updates, patches, and enhancements.',
  },
  {
    id: 'cloud-deployment-models',
    title: 'Types of Cloud Deployment Models',
    matchPatterns: [
      /\b(types\s+of\s+cloud\s+deployment|cloud\s+deployment\s+models|cloud\s+deployment\s+types|what\s+are\s+the\s+types\s+of\s+cloud\s+deployment)\b/i,
      /\b4\s+deployment\s+models\b/i,
    ],
    spokenText:
      'According to cloud computing standards like NIST, there are four primary cloud deployment models: 1. Public Cloud: Resources are owned and operated by a third-party cloud provider and delivered over the internet to multiple organizations. Examples include AWS, Google Cloud, and Microsoft Azure. 2. Private Cloud: Cloud infrastructure provisioned for exclusive use by a single organization, either on-premises or hosted by a provider, offering maximum security and control. 3. Hybrid Cloud: Combines public and private clouds, enabling workloads and data to move seamlessly between them. 4. Community Cloud: Shared infrastructure dedicated to a specific community of organizations with shared concerns, such as compliance or security policies.',
    summary:
      'Cloud Deployment Models (NIST Standard):\n1. Public Cloud: Shared multi-tenant environment hosted by third parties (e.g. AWS, Azure, GCP).\n2. Private Cloud: Dedicated single-tenant infrastructure exclusively for one organization.\n3. Hybrid Cloud: Integrates public and private clouds for optimal flexibility and workload balance.\n4. Community Cloud: Shared among organizations with common missions, regulations, or security requirements.',
  },
  {
    id: 'private-cloud-deployment',
    title: 'Private Cloud Deployment',
    matchPatterns: [
      /\b(what\s+is\s+private\s+cloud(\s+deployment)?|explain\s+private\s+cloud(\s+deployment)?|private\s+cloud\s+deployment)\b/i,
      /\bprivate\s+cloud\b/i,
    ],
    spokenText:
      'Private cloud deployment is a cloud computing environment dedicated solely to a single organization. Unlike a public cloud where computing resources are shared among multiple tenants, a private cloud is completely isolated. It can be hosted internally in an organization’s own data center or managed externally by a third-party cloud provider. Private clouds provide maximum data control, heightened security, and full regulatory compliance, making them essential for financial institutions, government agencies, and healthcare providers.',
    summary:
      'Private Cloud Deployment:\n- Definition: Cloud infrastructure provisioned for exclusive use by a single entity.\n- Tenancy: Dedicated single-tenant architecture (no shared hardware).\n- Hosting: Can be deployed on-premises (private data center) or hosted off-site by a cloud vendor.\n- Advantages: Stringent data sovereignty, high customization, dedicated network security, and compliance with standards like HIPAA or PCI-DSS.\n- Primary Users: Banks, defense contractors, and healthcare organizations.',
  },
  {
    id: 'python-file-handling',
    title: 'File Handling in Python Using Code',
    matchPatterns: [
      /\b(file\s+handling|handle\s+files?|read\s+and\s+write\s+files?|working\s+with\s+files?)\b.*\bpython\b/i,
      /\bpython\b.*\b(file\s+handling|file\s+operations?|reading\s+files?|writing\s+files?)\b/i,
      /\bexplain\s+file\s+handling\s+in\s+python\b/i,
    ],
    codeLanguage: 'python',
    codeSnippet: `# 1. Writing to a file using the 'with' statement
with open("sample.txt", "w") as file:
    file.write("Hello, LearnWell!\\n")
    file.write("File handling in Python is easy.\\n")

# 2. Reading from the file
with open("sample.txt", "r") as file:
    content = file.read()
    print("File Content:\\n", content)

# 3. Appending new data without overwriting
with open("sample.txt", "a") as file:
    file.write("Appended line.\\n")`,
    spokenText:
      'In Python, file handling allows you to create, read, update, and delete files on disk. The standard, best-practice way to handle files is using the with open statement, which automatically closes the file when operations are done, even if errors occur. The main file modes are: r for reading, w for writing or overwriting, and a for appending. In our code, we open sample dot txt with mode w to write two lines. Then we open it in mode r to read and print the full content with file dot read. Finally, we open it in mode a to append a new line to the end of the file.',
    summary:
      'File Handling in Python:\n\n1. Best Practice: Always use \`with open(...) as f:\` to guarantee proper resource cleanup and automatic file closing.\n2. Access Modes:\n   - "r": Read mode (default).\n   - "w": Write mode (creates or truncates file).\n   - "a": Append mode (adds content to file end).\n\n\`\`\`python\nwith open("sample.txt", "w") as file:\n    file.write("Hello, LearnWell!\\n")\n\nwith open("sample.txt", "r") as file:\n    print(file.read())\n\`\`\`',
  },
  {
    id: 'for-loop-vs-while-loop',
    title: 'Difference Between For Loop and While Loop',
    matchPatterns: [
      /\b(difference|compare|versus|vs)\b.*\b(for\s+loop)\b.*\b(while\s+loop)\b/i,
      /\b(difference|compare|versus|vs)\b.*\b(while\s+loop)\b.*\b(for\s+loop)\b/i,
      /\b(for\s+loop\s+and\s+while\s+loop|while\s+loop\s+and\s+for\s+loop)\b.*\b(difference|compare)\b/i,
    ],
    spokenText:
      'The key difference between a for loop and a while loop is definite versus indefinite iteration. A for loop is used when the number of iterations or the collection to traverse is known in advance, such as iterating over a fixed range of numbers or items in a list. A while loop is used when the number of iterations is not known in advance and the loop must continue repeating as long as a Boolean condition evaluates to true. In a for loop, initialization, condition checking, and stepping are cleanly structured in the loop declaration. In a while loop, you initialize variables before the loop and must explicitly update the loop condition inside the body to avoid an infinite loop.',
    summary:
      'Difference Between For Loop and While Loop:\n\n1. Iteration Type:\n   - For Loop: Definite iteration (known number of repetitions or fixed collection).\n   - While Loop: Indefinite iteration (repeats until condition evaluates to false).\n2. Loop Variable:\n   - For Loop: Automatically managed via iteration constructs or ranges.\n   - While Loop: Manually initialized before the loop and updated inside the body.\n3. Risk of Infinite Loop:\n   - For Loop: Very low since sequence length is finite.\n   - While Loop: High if loop condition is never updated to false.\n4. Example Use Cases:\n   - For Loop: Processing every item in a list or array.\n   - While Loop: Polling user input or waiting for a network response.',
  },
  {
    id: 'mode-formula-frequency-distribution',
    title: 'Mode Formula for Frequency Distribution (Grouped Data)',
    matchPatterns: [
      /\bmode\b.*\b(formula|frequency\s+distribution|grouped\s+data)\b/i,
      /\b(formula|frequency\s+distribution|grouped\s+data)\b.*\bmode\b/i,
      /\b(calculate|find|compute)\b.*\bmode\b.*\b(frequency|table|grouped)\b/i,
      /\bmode\s+formula\b/i,
    ],
    spokenText:
      'For a continuous frequency distribution or grouped data, the Mode is calculated using the formula: Mode equals L plus, open bracket, f1 minus f0, divided by 2 times f1 minus f0 minus f2, close bracket, multiplied by h. In this formula, L is the lower limit of the modal class, which is the class interval having the highest frequency. f1 is the frequency of the modal class. f0 is the frequency of the class preceding the modal class. f2 is the frequency of the class succeeding the modal class, and h is the class width. For example, if a distribution has class intervals with frequencies, and the modal class is 20 to 30 with highest frequency 15, lower limit 20, preceding frequency 8, succeeding frequency 7, and class width 10, the mode is 20 plus, 15 minus 8 divided by 30 minus 8 minus 7, times 10, which evaluates to 20 plus 4.67, giving approximately 24.67.',
    summary:
      '### Mode Formula for Grouped Frequency Distribution\n\n$$\\text{Mode} = L + \\left[ \\frac{f_1 - f_0}{2f_1 - f_0 - f_2} \\right] \\times h$$\n\nWhere:\n- **$L$**: Lower class limit of the modal class (the class with maximum frequency)\n- **$f_1$**: Frequency of the modal class\n- **$f_0$**: Frequency of the class preceding the modal class\n- **$f_2$**: Frequency of the class succeeding the modal class\n- **$h$**: Width / size of the modal class interval\n\n#### Example:\nGiven frequency distribution:\n- Class 10–20: Frequency = 8 ($f_0$)\n- Class **20–30**: Frequency = **15** ($f_1$, Modal Class, $L = 20$)\n- Class 30–40: Frequency = 7 ($f_2$)\n- Class width ($h$) = 10\n\n$$\\text{Mode} = 20 + \\left[ \\frac{15 - 8}{2(15) - 8 - 7} \\right] \\times 10 = 20 + \\left[ \\frac{7}{30 - 15} \\right] \\times 10 = 20 + \\frac{70}{15} \\approx 24.67$$',
  },
  {
    id: 'linear-data-structures',
    title: 'Linear Data Structures in Computer Science',
    matchPatterns: [
      /\blinear\s*(data\s*)?structures?\b/i,
      /\blinear\s+structures?\s+in\s+data\s+structures?\b/i,
      /\blinear\s+(versus|vs|and)\s+non[- ]linear\s+data\s+structures?\b/i,
      /\btypes\s+of\s+linear\s+data\s+structures?\b/i,
    ],
    spokenText:
      'In data structures, a linear data structure is a structure where data elements are organized sequentially or linearly, meaning each element is attached to its previous and next adjacent elements. All elements can be traversed in a single run. The four fundamental linear data structures are: Arrays, which store elements in contiguous memory with constant-time index access O(1); Linked Lists, where elements are stored in nodes connected by pointers; Stacks, which follow the Last-In First-Out or LIFO principle; and Queues, which follow the First-In First-Out or FIFO principle. In contrast, non-linear data structures, such as Trees and Graphs, arrange elements hierarchically or interconnectedly across multiple levels.',
    summary:
      '### Linear Data Structures in Computer Science\n\nA **linear data structure** arranges data elements sequentially where every element has a unique predecessor and successor (except the first and last).\n\n#### Core Linear Data Structures:\n1. **Arrays**: Fixed-size contiguous memory locations supporting $O(1)$ random index access.\n2. **Linked Lists**: Dynamic sequence of nodes connected via pointers (Singly, Doubly, Circular).\n3. **Stacks**: LIFO (Last In, First Out) collection with `push()` and `pop()` operations at the top.\n4. **Queues**: FIFO (First In, First Out) collection with `enqueue()` at the rear and `dequeue()` at the front.\n\n#### Linear vs Non-Linear Comparison:\n- **Traversal**: Linear can be traversed in a single pass; Non-linear (Trees, Graphs) requires hierarchical or multi-branch traversal.\n- **Memory**: Linear structures are sequential; Non-linear structures represent complex parent-child or network relationships.\n- **Search Complexity**: Linear search requires $O(n)$; Balanced tree search achieves $O(\\log n)$.',
  },
  {
    id: 'measures-of-central-tendency',
    title: 'Measures of Central Tendency: Mean, Median, and Mode',
    matchPatterns: [
      /\b(measures?\s+of\s+central\s+tendency|mean\s+median\s+and?\s+mode)\b/i,
      /\bwhat\s+are\s+the\s+measures\s+of\s+central\s+tendency\b/i,
      /\bcentral\s+tendency\b/i,
    ],
    spokenText:
      'The three primary measures of central tendency in statistics are Mean, Median, and Mode. The Mean is the arithmetic average, calculated by dividing the sum of all values by the total count. The Median is the middle observation when data is arranged in numerical order, splitting the dataset into two equal halves. The Mode is the most frequently occurring value in the dataset. In a moderately skewed distribution, Karl Pearson empirical formula states that Mode approximately equals 3 times the Median minus 2 times the Mean.',
    summary:
      '### Measures of Central Tendency\n\n1. **Mean ($\\bar{X}$)**: Arithmetic average.\n   - Ungrouped: $\\bar{X} = \\frac{\\sum X}{N}$\n   - Grouped: $\\bar{X} = \\frac{\\sum f X}{N}$\n2. **Median ($M$)**: Central value dividing ordered data into two equal halves.\n   - Grouped: $L + \\left[ \\frac{N/2 - cf}{f} \\right] \\times h$\n3. **Mode ($Z$)**: Most frequent value in the dataset.\n   - Grouped: $L + \\left[ \\frac{f_1 - f_0}{2f_1 - f_0 - f_2} \\right] \\times h$\n4. **Empirical Relationship (Karl Pearson)**:\n   $$\\text{Mode} \\approx 3(\\text{Median}) - 2(\\text{Mean})$$',
  },
]

// Built-in high-frequency universal facts
const CURATED_KNOWLEDGE: Record<string, string> = {
  photosynthesis:
    'Photosynthesis is the biological process used by plants, algae, and certain bacteria to convert light energy into chemical energy in the form of sugars.',
  'black hole':
    'A black hole is a region of spacetime where gravity is so strong that nothing, including light and other electromagnetic waves, has enough energy to escape its event horizon.',
  'alan turing':
    'Alan Turing was an English mathematician and computer scientist widely considered the father of theoretical computer science and artificial intelligence.',
  'albert einstein':
    'Albert Einstein was a theoretical physicist best known for developing the theory of relativity, which revolutionized the scientific understanding of space, time, and gravity.',
  'quantum computing':
    'Quantum computing is an emerging multidisciplinary field that uses the principles of quantum mechanics, like superposition and entanglement, to solve complex computational problems faster than classical computers.',
  gravity:
    'Gravity is a fundamental natural interaction in physics that causes mutual attraction between all things having mass or energy.',
  dna:
    'DNA, or deoxyribonucleic acid, is the hereditary molecule that carries genetic instructions for the development, functioning, growth, and reproduction of all known living organisms.',
  'artificial intelligence':
    'Artificial intelligence is the field of computer science dedicated to developing systems capable of performing tasks that typically require human intelligence, like speech recognition, reasoning, and learning.',
  'machine learning':
    'Machine learning is a branch of artificial intelligence focused on building algorithms that learn patterns from data and improve their performance over time without being explicitly programmed.',
  internet:
    'The Internet is a global system of interconnected computer networks that uses the Internet protocol suite to communicate between billions of devices worldwide.',
  saas:
    'Software as a Service, or SaaS, is a cloud computing service model where applications are hosted by a provider and made available to users over the internet through a web browser. Examples include Google Drive, Microsoft 365, and Salesforce.',
  'software as a service':
    'Software as a Service, or SaaS, is a cloud computing service model where applications are hosted by a provider and made available to users over the internet through a web browser. Examples include Google Drive, Microsoft 365, and Salesforce.',
  paas:
    'Platform as a Service, or PaaS, is a cloud computing model providing a platform that allows developers to build, run, and manage applications without managing underlying infrastructure. Examples include Google App Engine and Heroku.',
  'platform as a service':
    'Platform as a Service, or PaaS, is a cloud computing model providing a platform that allows developers to build, run, and manage applications without managing underlying infrastructure. Examples include Google App Engine and Heroku.',
  iaas:
    'Infrastructure as a Service, or IaaS, is a cloud computing model providing virtualized computing resources such as physical servers, storage, and networking over the internet. Examples include Amazon Web Services EC2 and Google Compute Engine.',
  'infrastructure as a service':
    'Infrastructure as a Service, or IaaS, is a cloud computing model providing virtualized computing resources such as physical servers, storage, and networking over the internet. Examples include Amazon Web Services EC2 and Google Compute Engine.',
  'cloud computing':
    'Cloud computing is the on-demand delivery of computing services, including servers, storage, databases, networking, software, and analytics, over the internet with pay-as-you-go pricing.',
}

/**
 * Normalizes text to extract the core topic of a query
 */
export function extractTopic(query: string): string {
  return query
    .toLowerCase()
    .replace(/^(who is|who was|what is|what are|what was|tell me about|explain|describe|define|how does|why does|why is|why are|give me a|give me|show me)\s+/i, '')
    .replace(/[?.!;,]+$/g, '')
    .trim()
}

/**
 * Tests if a query matches any known BCA curriculum concepts
 */
export function matchBcaCurriculum(query: string): UniversalAnswer | null {
  const clean = query.trim()

  for (const concept of BCA_CURRICULUM_KNOWLEDGE) {
    for (const pattern of concept.matchPatterns) {
      if (pattern.test(clean)) {
        return {
          title: concept.title,
          summary: concept.summary,
          spokenText: concept.spokenText,
          codeSnippet: concept.codeSnippet,
          codeLanguage: concept.codeLanguage,
          source: 'bca-curated',
        }
      }
    }
  }

  return null
}

const NON_ACADEMIC_CATEGORIES = [
  'band', 'album', 'song', 'musical', 'film', 'television series', 'tv series',
  'video game', 'comic', 'character', 'novel', 'actor', 'actress', 'musician',
  'single', 'soundtrack', 'record label', 'concert tour',
]

/**
 * Fetches an encyclopedic summary from Wikipedia REST API with strict disambiguation and domain validation
 */
async function fetchWikipediaSummary(topic: string, originalQuery: string): Promise<UniversalAnswer | null> {
  // Never search Wikipedia for raw pronouns or very short words
  if (/^(it|that|this|they|them|he|she|him|her)$/i.test(topic) || topic.length < 3) {
    return null
  }

  // If query is an academic question about OSI, disambiguate to OSI model
  let searchTopic = topic
  if (/\b(osi)\b/i.test(topic) && !/\b(band|music)\b/i.test(topic)) {
    searchTopic = 'OSI model'
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3500)

  try {
    const formattedTopic = encodeURIComponent(searchTopic.replace(/\s+/g, '_'))
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${formattedTopic}`

    const res = await fetch(summaryUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LearnWellAssistant/1.0 (Accessible Learning Platform; contact: support@learnwell.org)',
        Accept: 'application/json',
      },
    })

    if (res.ok) {
      const data = (await res.json()) as {
        type?: string
        title?: string
        description?: string
        extract?: string
      }

      if (data.extract && data.type !== 'disambiguation') {
        const descLower = (data.description || '').toLowerCase()
        // Reject pop-culture / non-academic pages if student asked an academic query
        const isAcademicQuestion = /\b(model|computer|network|system|code|algorithm|math|science|program|protocol)\b/i.test(originalQuery)
        if (isAcademicQuestion && NON_ACADEMIC_CATEGORIES.some((cat) => descLower.includes(cat))) {
          // Off-topic pop culture entity; abort Wikipedia match
          return null
        }

        const cleanExtract = data.extract
          .replace(/\s*\([^)]*\)/g, '') // remove parentheticals for cleaner speech
          .replace(/\s+/g, ' ')
          .trim()

        const sentences = cleanExtract.split(/(?<=[.!?])\s+/)
        const conciseAudio = sentences.slice(0, 3).join(' ')

        return {
          title: data.title || topic,
          summary: cleanExtract,
          spokenText: conciseAudio,
          source: 'wikipedia',
        }
      }
    }

    // Secondary search if direct lookup failed
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTopic)}&utf8=&format=json`
    const searchRes = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LearnWellAssistant/1.0 (Accessible Learning Platform)',
        Accept: 'application/json',
      },
    })

    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as {
        query?: {
          search?: Array<{ title: string; snippet: string }>
        }
      }

      const topResult = searchData.query?.search?.[0]
      if (topResult && topResult.title && topResult.title.toLowerCase() !== topic.toLowerCase()) {
        const snippetLower = topResult.snippet.toLowerCase()
        if (
          !NON_ACADEMIC_CATEGORIES.some((cat) => snippetLower.includes(cat)) &&
          isWikipediaArticleRelevant(topic, topResult.title)
        ) {
          return fetchWikipediaSummary(topResult.title, originalQuery)
        }
      }
    }
  } catch {
    // Network failure or timeout
  } finally {
    clearTimeout(timeoutId)
  }

  return null
}

const QUERY_FILTER_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'of', 'for', 'to', 'what',
  'how', 'why', 'can', 'you', 'tell', 'me', 'explain', 'give', 'about', 'with', 'from',
  'this', 'that', 'these', 'those', 'are', 'was', 'were', 'it', 'its', 'be', 'been',
  'does', 'do', 'did', 'have', 'has', 'had', 'example', 'examples', 'please', 'define',
  'describe', 'formula',
])

function isWikipediaArticleRelevant(topic: string, articleTitle: string): boolean {
  const cleanTopic = topic.toLowerCase()
  const cleanTitle = articleTitle.toLowerCase()

  if (cleanTopic === cleanTitle || cleanTitle.includes(cleanTopic) || cleanTopic.includes(cleanTitle)) {
    return true
  }

  const topicTokens = cleanTopic
    .split(/[\s,?.!;:()"-]+/)
    .filter((t) => t.length > 2 && !QUERY_FILTER_WORDS.has(t))

  if (topicTokens.length === 0) return false

  const titleTokens = new Set(
    cleanTitle.split(/[\s,?.!;:()"-]+/).filter((t) => t.length > 2)
  )

  let matches = 0
  for (const token of topicTokens) {
    if (titleTokens.has(token) || cleanTitle.includes(token)) {
      matches++
    }
  }

  const requiredMatches = topicTokens.length <= 2 ? 1 : 2
  return matches >= requiredMatches
}

/**
 * Answers universal & general knowledge questions
 */
export async function answerUniversalQuestion(query: string): Promise<UniversalAnswer | null> {
  // 0. Handle greetings immediately
  if (/^(hi|hello|hey|hey there|greetings|good (morning|afternoon|evening)|howdy)\b/i.test(query.trim())) {
    return {
      title: 'LEARNWELL ASSISTANT',
      summary: 'Hello! I am your LearnWell Voice Assistant. How can I help you today? You can ask me academic questions about your syllabus, ask me to take notes, or guide you through your courses.',
      spokenText: 'Hello! I am your LearnWell Voice Assistant. How can I help you today? You can ask me academic questions about your syllabus, ask me to take notes, or guide you through your courses.',
      source: 'local-encyclopedia',
    }
  }

  // 1. First check our verified BCA Curriculum Knowledge base
  const bcaMatch = matchBcaCurriculum(query)
  if (bcaMatch) {
    return bcaMatch
  }

  const topic = extractTopic(query)
  if (!topic || topic.length < 2) return null

  // 2. Check curated general knowledge concepts (exact or full-word token boundary only, NEVER substring of key)
  for (const [key, answer] of Object.entries(CURATED_KNOWLEDGE)) {
    const keyRegex = new RegExp(`(^|\\b)${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\b|$)`, 'i')
    if (topic === key || keyRegex.test(topic)) {
      return {
        title: key.toUpperCase(),
        summary: answer,
        spokenText: answer,
        source: 'local-encyclopedia',
      }
    }
  }

  // 3. Fetch online encyclopedic answer with strict domain filtering
  return fetchWikipediaSummary(topic, query)
}
