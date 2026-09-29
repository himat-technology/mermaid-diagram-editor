import type { DiagramTypeId, DiagramTypeInfo } from '../types/diagram';

export const DEFAULT_CODE = `flowchart LR
A[User] --> B[HiMat Website]
B --> C[Free Tool]
C --> D[Result]
`;

export const DIAGRAM_TYPES: DiagramTypeInfo[] = [
  {
    id: 'flowchart',
    label: 'Flowchart',
    description: 'Nodes and edges for processes and decisions',
    keywords: ['flowchart', 'graph'],
    template: `flowchart TD
    Start([Start]) --> Input[/Read request/]
    Input --> Valid{Valid?}
    Valid -- Yes --> Process[Process request]
    Valid -- No --> Error[Return error]
    Process --> Store[(Database)]
    Store --> Done([Done])
    Error --> Done
`,
  },
  {
    id: 'sequence',
    label: 'Sequence Diagram',
    description: 'Messages exchanged between participants over time',
    keywords: ['sequenceDiagram'],
    template: `sequenceDiagram
    autonumber
    actor User
    participant App
    participant API
    participant DB as Database
    User->>App: Click "Load profile"
    App->>API: GET /profile
    activate API
    API->>DB: SELECT * FROM users
    DB-->>API: user row
    API-->>App: 200 OK (JSON)
    deactivate API
    App-->>User: Render profile
    Note over App,API: Requests time out after 5s
`,
  },
  {
    id: 'class',
    label: 'Class Diagram',
    description: 'Classes, attributes, methods and relationships',
    keywords: ['classDiagram'],
    template: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() void
    }
    class Dog {
        +String breed
        +fetch() void
    }
    class Cat {
        +bool indoor
        +purr() void
    }
    class Owner {
        +String name
        +adopt(Animal a) void
    }
    Animal <|-- Dog
    Animal <|-- Cat
    Owner "1" --> "*" Animal : owns
`,
  },
  {
    id: 'state',
    label: 'State Diagram',
    description: 'States and transitions of a system',
    keywords: ['stateDiagram-v2', 'stateDiagram'],
    template: `stateDiagram-v2
    [*] --> Idle
    Idle --> Loading : fetch()
    Loading --> Success : resolved
    Loading --> Failure : rejected
    Failure --> Loading : retry()
    Success --> Idle : reset()
    Success --> [*]
    state Loading {
        [*] --> Requesting
        Requesting --> Parsing
        Parsing --> [*]
    }
`,
  },
  {
    id: 'er',
    label: 'Entity Relationship',
    description: 'Database entities and their relationships',
    keywords: ['erDiagram'],
    template: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
    CUSTOMER {
        int id PK
        string name
        string email UK
    }
    ORDER {
        int id PK
        int customer_id FK
        date created_at
        string status
    }
    LINE_ITEM {
        int order_id FK
        int product_id FK
        int quantity
    }
    PRODUCT {
        int id PK
        string sku UK
        decimal price
    }
`,
  },
  {
    id: 'journey',
    label: 'User Journey',
    description: 'Steps a user takes, scored by satisfaction',
    keywords: ['journey'],
    template: `journey
    title Online purchase journey
    section Discover
      Search for product: 4: Customer
      Read reviews: 3: Customer
    section Purchase
      Add to cart: 5: Customer
      Checkout: 2: Customer, Payment Service
    section After sale
      Receive package: 5: Customer, Courier
      Contact support: 1: Customer, Support
`,
  },
  {
    id: 'gantt',
    label: 'Gantt',
    description: 'Project schedules and task dependencies',
    keywords: ['gantt'],
    template: `gantt
    title Product launch plan
    dateFormat YYYY-MM-DD
    axisFormat %b %d
    section Design
    Research           :done,    des1, 2026-01-05, 7d
    Wireframes         :active,  des2, after des1, 5d
    section Build
    Backend API        :         dev1, after des2, 10d
    Frontend           :         dev2, after des2, 12d
    section Launch
    QA                 :crit,    qa1, after dev2, 5d
    Release            :milestone, rel, after qa1, 0d
`,
  },
  {
    id: 'pie',
    label: 'Pie Chart',
    description: 'Proportions of a whole',
    keywords: ['pie'],
    template: `pie showData
    title Traffic sources
    "Organic search" : 42
    "Direct" : 25
    "Referral" : 18
    "Social" : 15
`,
  },
  {
    id: 'gitGraph',
    label: 'Git Graph',
    description: 'Branches, commits and merges',
    keywords: ['gitGraph'],
    template: `gitGraph
    commit id: "init"
    commit id: "setup"
    branch feature/login
    checkout feature/login
    commit id: "login form"
    commit id: "validation"
    checkout main
    commit id: "hotfix"
    merge feature/login
    branch release
    checkout release
    commit id: "v1.0" tag: "v1.0.0"
`,
  },
  {
    id: 'mindmap',
    label: 'Mindmap',
    description: 'Hierarchical ideas branching from a root',
    keywords: ['mindmap'],
    template: `mindmap
  root((Web App))
    Frontend
      React
      CSS
      Accessibility
    Backend
      API
      Auth
      Jobs
    Data
      PostgreSQL
      Redis
    Ops
      CI/CD
      Monitoring
`,
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'Chronological events grouped by period',
    keywords: ['timeline'],
    template: `timeline
    title Product history
    section 2024
      Q1 : Idea validated
      Q3 : MVP launched : First 100 users
    section 2025
      Q1 : Seed funding
      Q4 : Mobile app released
    section 2026
      Q2 : 1M users
`,
  },
  {
    id: 'quadrant',
    label: 'Quadrant Chart',
    description: 'Items plotted on two axes in four quadrants',
    keywords: ['quadrantChart'],
    template: `quadrantChart
    title Feature prioritization
    x-axis Low effort --> High effort
    y-axis Low impact --> High impact
    quadrant-1 Plan carefully
    quadrant-2 Quick wins
    quadrant-3 Fill-ins
    quadrant-4 Avoid
    Dark mode: [0.25, 0.7]
    SSO: [0.8, 0.85]
    Export PDF: [0.45, 0.4]
    Emoji reactions: [0.2, 0.15]
    Offline sync: [0.9, 0.3]
`,
  },
  {
    id: 'requirement',
    label: 'Requirement Diagram',
    description: 'Requirements and the elements that satisfy them',
    keywords: ['requirementDiagram'],
    template: `requirementDiagram
    requirement login_req {
        id: 1
        text: Users must be able to log in
        risk: high
        verifymethod: test
    }
    performanceRequirement response_time {
        id: 1.1
        text: Login responds within 500ms
        risk: medium
        verifymethod: analysis
    }
    element auth_service {
        type: service
        docref: docs/auth.md
    }
    element e2e_tests {
        type: "test suite"
    }
    auth_service - satisfies -> login_req
    e2e_tests - verifies -> login_req
    login_req - contains -> response_time
`,
  },
  {
    id: 'c4',
    label: 'C4 Diagram',
    description: 'Software architecture using the C4 model',
    keywords: ['C4Context', 'C4Container', 'C4Component', 'C4Dynamic', 'C4Deployment'],
    template: `C4Context
    title System context for an online store
    Person(customer, "Customer", "Buys products online")
    Person(admin, "Admin", "Manages the catalog")
    System(store, "Online Store", "Lets customers browse and order")
    System_Ext(payments, "Payment Provider", "Processes card payments")
    System_Ext(email, "Email Service", "Sends notifications")
    Rel(customer, store, "Browses and orders", "HTTPS")
    Rel(admin, store, "Manages products", "HTTPS")
    Rel(store, payments, "Charges cards", "REST")
    Rel(store, email, "Sends emails", "SMTP")
`,
  },
  {
    id: 'architecture',
    label: 'Architecture Diagram',
    description: 'Cloud and infrastructure services with groups',
    keywords: ['architecture-beta'],
    template: `architecture-beta
    group api(cloud)[API]

    service db(database)[Database] in api
    service disk1(disk)[Storage] in api
    service disk2(disk)[Backup] in api
    service server(server)[Server] in api

    db:L -- R:server
    disk1:T -- B:server
    disk2:T -- B:db
`,
  },
  {
    id: 'sankey',
    label: 'Sankey',
    description: 'Flows between nodes with proportional widths',
    keywords: ['sankey-beta', 'sankey'],
    template: `sankey-beta
Visitors,Signed up,600
Visitors,Bounced,400
Signed up,Activated,420
Signed up,Churned,180
Activated,Paid,160
Activated,Free,260
`,
  },
  {
    id: 'xychart',
    label: 'XY Chart',
    description: 'Bar and line charts on x/y axes',
    keywords: ['xychart-beta', 'xychart'],
    template: `xychart-beta
    title "Monthly revenue (k$)"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    y-axis "Revenue" 0 --> 120
    bar [42, 55, 61, 78, 90, 104]
    line [40, 50, 60, 70, 85, 100]
`,
  },
  {
    id: 'block',
    label: 'Block Diagram',
    description: 'Blocks laid out in columns with connections',
    keywords: ['block-beta', 'block'],
    template: `block-beta
    columns 3
    client["Client"]:3
    space
    lb["Load balancer"]
    space
    api1["API 1"] api2["API 2"] api3["API 3"]
    db[("Database")]:3
    client --> lb
    lb --> api2
    api2 --> db
`,
  },
  {
    id: 'kanban',
    label: 'Kanban',
    description: 'Task board with columns and cards',
    keywords: ['kanban'],
    template: `kanban
  todo[To Do]
    t1[Write API docs]
    t2[Design onboarding]
  doing[In Progress]
    t3[Implement exports]@{ assigned: 'alex', priority: 'High' }
  review[Review]
    t4[Share links]
  done[Done]
    t5[Project setup]
`,
  },
  {
    id: 'treeView',
    label: 'TreeView',
    description: 'File and folder hierarchies',
    keywords: ['treeView-beta'],
    template: `treeView-beta
    "my-app"
        "src"
            "components"
                "App.tsx"
            "main.tsx"
        "public"
            "favicon.svg"
        "package.json"
        "README.md"
`,
  },
  {
    id: 'venn',
    label: 'Venn',
    description: 'Overlapping sets',
    keywords: ['venn-beta'],
    template: `venn-beta
    title "Engineering skills"
    set Frontend
    set Backend
    set DevOps
    union Frontend,Backend["Full stack"]
    union Backend,DevOps["Platform"]
`,
  },
  {
    id: 'radar',
    label: 'Radar',
    description: 'Multiple values on radial axes',
    keywords: ['radar-beta'],
    template: `radar-beta
    title Framework comparison
    axis perf["Performance"], dx["Developer experience"], eco["Ecosystem"]
    axis learn["Learning curve"], size["Bundle size"]
    curve react["React"]{4, 4, 5, 3, 3}
    curve svelte["Svelte"]{5, 5, 3, 4, 5}
    max 5
    min 0
`,
  },
  {
    id: 'ishikawa',
    label: 'Ishikawa',
    description: 'Fishbone cause-and-effect analysis',
    keywords: ['ishikawa-beta', 'ishikawa'],
    template: `ishikawa-beta
    Slow page loads
        People
            No performance budget
        Process
            No load testing
        Technology
            Unoptimized images
            N+1 database queries
        Environment
            Shared hosting
`,
  },
];

export const DIAGRAM_TYPE_MAP: Record<string, DiagramTypeInfo> = Object.fromEntries(DIAGRAM_TYPES.map((t) => [t.id, t]));

export function getDiagramTypeLabel(id: DiagramTypeId): string {
  if (id === 'packet') return 'Packet';
  if (id === 'treemap') return 'Treemap';
  return DIAGRAM_TYPE_MAP[id]?.label ?? 'Unknown';
}
