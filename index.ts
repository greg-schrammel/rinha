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
  const { data: tx, problems } = transaction(await request.json())

  if (problems) throw UnprocessableEntity

  const user = queryUser(customerId)
  if (!user) {
    console.log('user not found')
    throw NotFound
  }

  return send(
    db.transaction(() => {
      let newBalance = user.balance
      if (tx.tipo === 'd') {
        newBalance -= tx.valor
        if (newBalance < -user.credit) throw UnprocessableEntity
      } else {
        newBalance += tx.valor
      }

      updateUser(customerId, newBalance)
      insertTransaction(customerId, tx.valor, tx.tipo, tx.descricao, t)

      return {
        limite: user.credit,
        saldo: newBalance,
      }
    })(),
  )
}

function handleStatement(customerId: CustomerId) {
  const user = queryUser(customerId)
  if (!user) {
    console.log('user not found')
    throw NotFound
  }

  const transactions = queryTransactions(customerId)

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
    if (rootPath != 'clientes' || !customerId || +customerId > 5) return NotFound

    try {
      if (endpoint === 'transacoes' && request.method === 'POST') {
        return await handleTransaction(customerId, request)
      }

      if (endpoint == 'extrato' && request.method === 'GET') {
        return handleStatement(customerId)
      }
    } catch (e) {
      if (e instanceof Response) return e
      console.log('error: ', e)
      return BadRequest
    }

    return NotFound
  },
} // satisfies Serve
