import { type } from 'arktype'
import db, { insertTransaction, queryTransactions, queryUser, updateUser } from './db'

type CustomerId = number

const transaction = type({
  valor: ['integer', '=>', (n) => n >= 0],
  tipo: "'c'|'d'",
  descricao: '0<string<11',
})

export type Transaction = typeof transaction.infer

async function handleTransaction(customerId: CustomerId, request: Request) {
  const t = Date.now()
  const p = Date.now()
  const { data: tx, problems } = transaction(await request.json())
  if (Date.now() - p > 2) console.log('parse tx', Date.now() - p)

  if (problems) throw UnprocessableEntity

  const uu = Date.now()
  const user = queryUser(customerId)
  if (Date.now() - uu > 2) console.log('query user', Date.now() - uu)
  if (!user) throw NotFound

  return send(
    db.transaction(() => {
      let newBalance = user.balance
      if (tx.tipo === 'd') {
        newBalance -= tx.valor
        if (newBalance < -user.credit) throw UnprocessableEntity
      } else {
        newBalance += tx.valor
      }
      const uu = Date.now()
      updateUser(customerId, newBalance)
      if (Date.now() - uu > 2) console.log('update user', Date.now() - uu)

      const it = Date.now()
      insertTransaction(customerId, tx.valor, tx.tipo, tx.descricao, t)
      if (Date.now() - it > 2) console.log('insert tx', Date.now() - it)

      return {
        limite: user.credit,
        saldo: newBalance,
      }
    })(),
  )
}

function handleStatement(customerId: CustomerId) {
  const user = queryUser(customerId)
  if (!user) throw NotFound

  const it = Date.now()
  const transactions = queryTransactions(customerId)
  if (Date.now() - it > 2) console.log('query tx', Date.now() - it)

  return send({
    saldo: {
      total: user.balance,
      data_extrato: new Date(Date.now()).toISOString(),
      limite: user.credit,
    },
    ultimas_transacoes: transactions?.map((tx) => ({
      valor: tx.value,
      tipo: tx.type,
      descricao: tx.description,
      realizada_em: new Date(tx.timestamp).toISOString(),
    })),
  })
}

const headers = { 'Access-Control-Allow-Origin': '*' }
const BadRequest = new Response(null, { status: 400, headers })
const NotFound = new Response(null, { status: 404, headers })
const UnprocessableEntity = new Response(null, { status: 422, headers })
const send = (body: object) => new Response(JSON.stringify(body), { status: 200, headers })

console.log('starting at port', process.env.port)

export default {
  port: (process.env.port as unknown as number) || 9999,
  async fetch(request: Request) {
    const url = new URL(request.url)

    const [_, rootPath, _customerId, endpoint] = url.pathname.split('/')
    const customerId = _customerId && +_customerId
    if (rootPath != 'clientes' || !customerId) return NotFound

    try {
      if (endpoint === 'transacoes' && request.method === 'POST') {
        const a = Date.now()
        const r = await handleTransaction(customerId, request)
        if (Date.now() - a > 2) console.log('handleTx', { customerId }, Date.now() - a)
        return r
      }

      if (endpoint == 'extrato' && request.method === 'GET') {
        const r = await handleStatement(customerId)
        return r
      }
    } catch (e) {
      if (e instanceof Response) return e
      console.log('error: ', e)
      return BadRequest
    }

    return NotFound
  },
} //satisfies Serve
