import { Database } from 'bun:sqlite'

// const db = new Database('/usr/src/db/rinha', { create: true })
const db = new Database('rinha', { create: true })

db.run('PRAGMA busy_timeout = 100;')
db.run('PRAGMA journal_mode = wal;')

function setup() {
  console.log(`init db setup`)

  // db.run('DELETE FROM users;')
  // db.run('DELETE FROM transactions;')

  db.run(
    `CREATE TABLE IF NOT EXISTS users (userId INTEGER PRIMARY KEY, credit INTEGER, balance INTEGER);`,
  )
  db.run(
    `CREATE TABLE IF NOT EXISTS transactions (userId INTEGER, value INTEGER, type TEXT, description TEXT, timestamp DATETIME DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), txId INTEGER PRIMARY KEY);`,
  )

  console.log(`inserting users`)

  const insertUser = db.prepare(
    'INSERT INTO users (userId, credit, balance) VALUES ($id, $credit, $balance)',
  )
  const insertUsers = db.transaction((users) => {
    for (const user of users) insertUser.run(user)
    return users.length
  })
  const usersCount = insertUsers([
    { $id: 1, $credit: 100000, $balance: 0 },
    { $id: 2, $credit: 80000, $balance: 0 },
    { $id: 3, $credit: 1000000, $balance: 0 },
    { $id: 4, $credit: 10000000, $balance: 0 },
    { $id: 5, $credit: 500000, $balance: 0 },
  ])

  console.log(`succesfully inserted ${usersCount} users`)

  console.log(`db setup is done`)
}

if (process.env.port === '3000') setup()

type User = {
  userId: number
  credit: number
  balance: number
}

type Transaction = {
  userId: number
  value: number
  type: string
  description: string
  timestamp: number
}

const selectUser = db.query('SELECT * FROM users WHERE userId = $id')
export const queryUser = (id: number) => selectUser.get({ $id: id }) as User | null

const updateUserQuery = db.query('UPDATE users SET balance = $balance WHERE userId = $id')
export const updateUser = (id: number, balance: number) =>
  updateUserQuery.run({ $id: id, $balance: balance })

const selectTransactionsQuery = db.query(
  'SELECT * FROM transactions WHERE userId = $id ORDER BY timestamp DESC LIMIT 10',
)
export const queryTransactions = (id: number) =>
  selectTransactionsQuery.all({ $id: id }) as Transaction[] | null

const insertTransactionQuery = db.query(
  'INSERT INTO transactions (userId, value, type, description, timestamp) VALUES ($id, $value, $type, $description, $timestamp)',
)
export const insertTransaction = (
  id: number,
  value: number,
  type: string,
  description: string,
  timestamp: number,
) =>
  insertTransactionQuery.run({
    $id: id,
    $value: value,
    $type: type,
    $description: description,
    $timestamp: timestamp,
  })

export default db
