import { Database } from 'bun:sqlite'

console.log(`creating db`)

// const db = new Database('/usr/src/db', { create: true })
const db = new Database('', { create: true })

try {
  db.exec('PRAGMA journal_mode = wal2;')
  db.prepare('DELETE FROM users;').run()
  db.prepare('DELETE FROM transactions;').run()
} catch {}

try {
  db.query(
    `CREATE TABLE IF NOT EXISTS users (userId INTEGER PRIMARY KEY, credit INTEGER, balance INTEGER);`,
  ).run()
  db.query(
    `CREATE TABLE IF NOT EXISTS transactions (userId REFERENCES users(userId), value INTEGER, type TEXT, description TEXT, timestamp DATETIME DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), txId INTEGER PRIMARY KEY);`,
  ).run()
} catch {}

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

try {
  if (!queryUser(1)) {
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
  }
} catch {}
