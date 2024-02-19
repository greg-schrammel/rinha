let i = 0

const api1 = 'localhost:3000'
const api2 = 'localhost:3001'

export default {
  port: 9999,
  async fetch(request: Request) {
    let url = new URL(request.url)

    if (i === 0) {
      i++
      url.host = api1
    } else {
      i -= 1
      url.host = api2
    }

    return fetch(
      new Request(url, {
        method: request.method,
        body: request.method === 'POST' ? await request.text() : undefined,
      }),
    )
  },
} // satisfies Serve
