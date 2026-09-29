import type { DiagramTemplate } from '../types/diagram';

export const TEMPLATES: DiagramTemplate[] = [
  {
    id: 'saas-architecture',
    name: 'SaaS Architecture',
    category: 'Architecture',
    description: 'Multi-tenant SaaS with web app, API, workers and data stores',
    code: `flowchart LR
    subgraph Clients
        Browser[Web browser]
        Mobile[Mobile app]
    end
    subgraph Edge
        CDN[CDN]
        WAF[WAF / Rate limiter]
    end
    subgraph Platform
        Web[Web frontend]
        API[API gateway]
        Auth[Auth service]
        Billing[Billing service]
        Core[Core service]
        Worker[Background workers]
    end
    subgraph Data
        PG[(PostgreSQL)]
        Redis[(Redis cache)]
        Queue[[Message queue]]
        S3[(Object storage)]
    end
    Browser --> CDN --> Web
    Mobile --> WAF
    Web --> WAF --> API
    API --> Auth
    API --> Core
    API --> Billing
    Core --> PG
    Core --> Redis
    Core --> Queue --> Worker
    Worker --> S3
    Billing --> Stripe[(Stripe)]
`,
  },
  {
    id: 'auth-flow',
    name: 'Authentication Flow',
    category: 'Security',
    description: 'OAuth 2.0 authorization code flow with PKCE',
    code: `sequenceDiagram
    autonumber
    actor U as User
    participant C as Client app
    participant A as Auth server
    participant R as Resource API
    U->>C: Click "Sign in"
    C->>C: Generate code_verifier + code_challenge
    C->>A: /authorize?code_challenge=...
    A->>U: Show login page
    U->>A: Enter credentials
    A-->>C: Redirect with authorization code
    C->>A: POST /token (code + code_verifier)
    alt verifier valid
        A-->>C: access_token + refresh_token
        C->>R: GET /me (Bearer token)
        R-->>C: 200 user profile
    else invalid
        A-->>C: 400 invalid_grant
    end
`,
  },
  {
    id: 'cicd-pipeline',
    name: 'CI/CD Pipeline',
    category: 'DevOps',
    description: 'Build, test, scan and deploy with manual production approval',
    code: `flowchart LR
    Push([git push]) --> Lint[Lint & type-check]
    Lint --> Unit[Unit tests]
    Unit --> Build[Build artifacts]
    Build --> Scan{Security scan}
    Scan -- fail --> Notify[Notify team]
    Scan -- pass --> Image[Build container image]
    Image --> Registry[(Container registry)]
    Registry --> Staging[Deploy to staging]
    Staging --> E2E[E2E tests]
    E2E --> Approve{Manual approval}
    Approve -- approved --> Prod[Deploy to production]
    Approve -- rejected --> Notify
    Prod --> Monitor[Monitor & rollback on alerts]
`,
  },
  {
    id: 'payment-flow',
    name: 'Payment Flow',
    category: 'Business',
    description: 'Card payment with 3-D Secure and webhook confirmation',
    code: `sequenceDiagram
    actor Customer
    participant Shop as Checkout
    participant API as Shop API
    participant PSP as Payment provider
    participant Bank as Issuing bank
    Customer->>Shop: Pay $49.00
    Shop->>API: Create payment intent
    API->>PSP: POST /payment_intents
    PSP-->>API: client_secret
    API-->>Shop: client_secret
    Shop->>PSP: Confirm card payment
    PSP->>Bank: Authorize
    opt 3-D Secure required
        Bank-->>Customer: Challenge
        Customer->>Bank: Approve
    end
    Bank-->>PSP: Authorized
    PSP-->>Shop: Payment succeeded
    PSP->>API: Webhook payment_intent.succeeded
    API->>API: Mark order as paid
    Shop-->>Customer: Show receipt
`,
  },
  {
    id: 'microservices',
    name: 'Microservices Architecture',
    category: 'Architecture',
    description: 'Services behind a gateway communicating via events',
    code: `flowchart TB
    Client[Clients] --> GW[API gateway]
    GW --> Users[User service]
    GW --> Orders[Order service]
    GW --> Catalog[Catalog service]
    GW --> Search[Search service]
    Users --> UsersDB[(Users DB)]
    Orders --> OrdersDB[(Orders DB)]
    Catalog --> CatalogDB[(Catalog DB)]
    Search --> ES[(Elasticsearch)]
    Orders -- OrderPlaced --> Bus{{Event bus}}
    Catalog -- ProductUpdated --> Bus
    Bus --> Inventory[Inventory service]
    Bus --> Notifications[Notification service]
    Bus --> Search
    Inventory --> InvDB[(Inventory DB)]
`,
  },
  {
    id: 'database-architecture',
    name: 'Database Architecture',
    category: 'Data',
    description: 'Blog platform schema with users, posts, comments and tags',
    code: `erDiagram
    USERS ||--o{ POSTS : writes
    USERS ||--o{ COMMENTS : writes
    POSTS ||--o{ COMMENTS : has
    POSTS ||--o{ POST_TAGS : tagged
    TAGS ||--o{ POST_TAGS : labels
    USERS {
        uuid id PK
        string email UK
        string display_name
        timestamp created_at
    }
    POSTS {
        uuid id PK
        uuid author_id FK
        string title
        text body
        boolean published
    }
    COMMENTS {
        uuid id PK
        uuid post_id FK
        uuid author_id FK
        text body
    }
    TAGS {
        int id PK
        string slug UK
    }
    POST_TAGS {
        uuid post_id FK
        int tag_id FK
    }
`,
  },
  {
    id: 'api-request-flow',
    name: 'API Request Flow',
    category: 'Backend',
    description: 'Request lifecycle through middleware, cache and database',
    code: `flowchart TD
    Req([HTTP request]) --> RL{Rate limit OK?}
    RL -- No --> R429[429 Too Many Requests]
    RL -- Yes --> Auth{Valid token?}
    Auth -- No --> R401[401 Unauthorized]
    Auth -- Yes --> Val{Valid payload?}
    Val -- No --> R400[400 Bad Request]
    Val -- Yes --> Cache{Cache hit?}
    Cache -- Yes --> R200[200 OK]
    Cache -- No --> Handler[Route handler]
    Handler --> DB[(Database)]
    DB --> Store[Write to cache]
    Store --> R200
    Handler -. exception .-> R500[500 Internal Error]
`,
  },
  {
    id: 'user-registration',
    name: 'User Registration Flow',
    category: 'Product',
    description: 'Sign-up with validation and email verification',
    code: `flowchart TD
    Start([Visit sign-up page]) --> Form[Fill email & password]
    Form --> Validate{Input valid?}
    Validate -- No --> Form
    Validate -- Yes --> Exists{Email already registered?}
    Exists -- Yes --> Login[Suggest login / reset password]
    Exists -- No --> Create[Create pending account]
    Create --> Send[Send verification email]
    Send --> Wait{Link clicked within 24h?}
    Wait -- No --> Expire[Expire token]
    Expire --> Resend[Offer resend]
    Resend --> Send
    Wait -- Yes --> Activate[Activate account]
    Activate --> Onboard[Onboarding wizard]
    Onboard --> Done([Dashboard])
`,
  },
  {
    id: 'cloud-architecture',
    name: 'Cloud Architecture',
    category: 'Architecture',
    description: 'Cloud deployment using the architecture diagram syntax',
    code: `architecture-beta
    group cloud(cloud)[Cloud]
    group vpc(cloud)[VPC] in cloud

    service internet(internet)[Internet]
    service lb(server)[Load balancer] in cloud
    service app1(server)[App server 1] in vpc
    service app2(server)[App server 2] in vpc
    service db(database)[Primary DB] in vpc
    service bucket(disk)[Object storage] in cloud

    internet:R --> L:lb
    lb:R --> L:app1
    lb:B --> T:app2
    app1:R --> L:db
    app2:R --> B:db
    app1:T --> B:bucket
`,
  },
  {
    id: 'ecommerce-order',
    name: 'E-commerce Order Flow',
    category: 'Business',
    description: 'Order lifecycle as a state machine',
    code: `stateDiagram-v2
    [*] --> Cart
    Cart --> Checkout : proceed
    Checkout --> PaymentPending : place order
    PaymentPending --> Paid : payment succeeded
    PaymentPending --> Cancelled : payment failed
    Paid --> Fulfillment
    state Fulfillment {
        [*] --> Picking
        Picking --> Packing
        Packing --> Shipped
        Shipped --> [*]
    }
    Fulfillment --> Delivered : carrier confirms
    Delivered --> Returned : return requested
    Returned --> Refunded
    Delivered --> [*]
    Refunded --> [*]
    Cancelled --> [*]
`,
  },
];
