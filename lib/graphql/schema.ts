export const typeDefs = /* GraphQL */ `
  type SessionUser {
    id: ID!
    name: String
    email: String
    role: String!
    employeeSubRole: String
    clientId: String
    employeeId: String
    permissions: [String!]!
  }

  type Dashboard {
    activeClients: Int!
    newClientsOnboarded: Int!
    activeOrders: Int!
    pendingScripts: Int!
    pendingScriptApprovals: Int!
    pendingVideoApprovals: Int!
    pendingApprovals: Int!
    videosInProduction: Int!
    videosPendingApproval: Int!
    videosUnderRevision: Int!
    videosDelivered: Int!
    upcomingShoots: Int!
    todayShoots: Int!
    urgentTasks: Int!
    overdueTasks: Int!
    overduePayments: Int!
    openTickets: Int!
    revenue: Float
    expenses: Float
    netProfit: Float
    totalReceivables: Float
    todayShootList: [Shoot!]!
    urgentTaskList: [Task!]!
    overdueTaskList: [Task!]!
    pendingScriptApprovalList: [Script!]!
    pendingVideoApprovalList: [Video!]!
  }

  type Client {
    id: ID!
    name: String
    companyName: String
    email: String
    phone: String
    whatsapp: String
    brandName: String
    industry: String
    gstTaxId: String
    assignedEmployeeId: String
    assignedEmployeeName: String
    source: String
    status: String
    createdAt: String
  }

  type Production {
    ordered: Int
    assigned: Int
    completed: Int
    delivered: Int
    remaining: Int
  }

  type Order {
    id: ID!
    clientId: String
    clientName: String
    companyName: String
    packageName: String
    contractedVideoCount: Int
    pricing: Float
    gstTax: Float
    totalInvoiceAmount: Float
    amountReceived: Float
    outstandingBalance: Float
    status: String
    production: Production
    startDate: String
    dueDate: String
  }

  type Script {
    id: ID!
    clientId: String
    companyName: String
    orderId: String
    videoNumber: Int
    language: String
    status: String
    deadline: String
    revisionCount: Int
  }

  type Creator {
    id: ID!
    name: String
    location: String
    availability: String
    rate: Float
    email: String
    phone: String
    languages: [String!]
    niches: [String!]
    upiId: String
  }

  type Shoot {
    id: ID!
    clientId: String
    companyName: String
    location: String
    status: String
    scheduledAt: String
  }

  type Video {
    id: ID!
    clientId: String
    companyName: String
    orderId: String
    videoNumber: Int
    status: String
    deadline: String
    revisionCount: Int
    finalDeliveryLink: String
  }

  type Task {
    id: ID!
    title: String
    status: String
    priority: String
    deadline: String
    assigneeName: String
  }

  type Payment {
    id: ID!
    clientId: String
    companyName: String
    invoiceAmount: Float
    amountReceived: Float
    pendingBalance: Float
    status: String
    paymentDate: String
  }

  type Expense {
    id: ID!
    category: String
    amount: Float
    date: String
  }

  type Payout {
    id: ID!
    creatorId: String
    orderId: String
    videoCount: Int
    contractedRate: Float
    totalPayout: Float
    status: String
  }

  type Ticket {
    id: ID!
    subject: String
    status: String
    companyName: String
  }

  type Employee {
    id: ID!
    name: String
    email: String
    jobTitle: String
    department: String
    employeeSubRole: String
    isActive: Boolean
  }

  type User {
    id: ID!
    name: String
    email: String
    role: String
    employeeSubRole: String
    permissions: [String!]
    isActive: Boolean
  }

  type Query {
    me: SessionUser!
    dashboard: Dashboard!
    clients(q: String, status: String): [Client!]!
    client(id: ID!): Client
    orders(q: String, status: String): [Order!]!
    order(id: ID!): Order
    scripts(q: String, status: String): [Script!]!
    script(id: ID!): Script
    creators(q: String): [Creator!]!
    creator(id: ID!): Creator
    shoots(q: String, status: String): [Shoot!]!
    shoot(id: ID!): Shoot
    videos(q: String, status: String): [Video!]!
    video(id: ID!): Video
    tasks(status: String, priority: String): [Task!]!
    payments(status: String): [Payment!]!
    expenses(category: String): [Expense!]!
    payouts(status: String): [Payout!]!
    tickets(status: String): [Ticket!]!
    employees: [Employee!]!
    users: [User!]!
  }
`;
