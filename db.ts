import { Database } from 'bun:sqlite'

console.log(`creating db`)

const db = new Database('', { create: true })

db.exec('PRAGMA journal_mode = WAL;')

console.log(`creating tables`)

db.query(`CREATE TABLE users (userId INTEGER PRIMARY KEY, credit INTEGER, balance INTEGER);`).run()
db.query(
  `CREATE TABLE transactions (userId REFERENCES users(userId), value INTEGER, type TEXT, description TEXT, timestamp DATE DEFAULT CURRENT_TIMESTAMP, txId INTEGER PRIMARY KEY);`,
).run()

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

const selectUser = db.prepare('SELECT * FROM users WHERE userId = $id')
export const queryUser = (id: number) => selectUser.get({ $id: id }) as User | null

const preparedUpdateUser = db.prepare(
  'UPDATE users SET credit = $credit, balance = $balance WHERE userId = $id',
)
export const updateUser = (id: number, credit: number, balance: number) =>
  preparedUpdateUser.run({ $id: id, $credit: credit, $balance: balance })

const selectTransactions = db.prepare('SELECT * FROM transactions WHERE userId = $id LIMIT 10')
export const queryTransactions = (id: number) =>
  selectTransactions.all({ $id: id }) as Transaction[] | null

const prepareInsertTransaction = db.prepare(
  'INSERT INTO transactions (userId, value, type, description) VALUES ($id, $value, $type, $description)',
)
export const insertTransaction = (id: number, value: number, type: string, description: string) =>
  prepareInsertTransaction.run({ $id: id, $value: value, $type: type, $description: description })

export default db
