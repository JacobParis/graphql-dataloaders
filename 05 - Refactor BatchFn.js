/**
 * Lesson 05 - Refactor BatchFn
 * 
 * The next refactor is to extract the database operation
 * into configurable Batch Function method, so we can use this loader
 * for more than just selecting users by ID
 * 
 * Lets stop here and make sure everything still works
 */
const { ApolloServer, gql } = require('apollo-server')

const sql = require('knex')({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    port : 5432,
    user : 'postgres',
    password : 'password',
    database : 'postgres'
  }
});

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = gql`
  type Query {
    posts: [Post]
  }

  type Post {
    id: String
    title: String
    author: User
  }

  type User {
    id: String
    name: String
  }
`

const cache = {
  promises: {},
  activeQuery: null,

  batchFn(keys) {
    return sql
      .select('*')
      .from('users')
      .whereIn('id', keys)
  },

  schedulingFn() {
    // Wait until the batch is ready
    // Increase the timeout to make larger, slower batches
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve()
      })
    })
  },

  async load(key) {
    if (this.promises[key]) {
      // We've queried this before, return the cached promise
      return this.promises[key]
    } else {
      // Just a placeholder until the batch is ready to go
      this.promises[key] = null
    }

    await this.schedulingFn()

    if (!this.activeQuery) {
      // Query all IDs at once
      const ids = Object.keys(this.promises)
      console.log(`SELECT * from users WHERE id in (${ids.join(',')})`)

      this.activeQuery = this.batchFn(ids)
    }

    // Cache a promise that waits on the active query
    this.promises[
      key
    ] = this.activeQuery.then((items) => {
      // And selects the item with this id
      return items.find((item) => item.id === Number(key))
    })

    return this.promises[key]
  },
}

const resolvers = {
  Query: {
    posts() {
      // Executes once per query
      console.log('SELECT * from posts')
      return sql('posts').select('*')
    },
  },
  Post: {
    async author(post) {
      // Executes once per post per query
      return cache.load(post.author_id)
    },
  },
}

const server = new ApolloServer({ typeDefs, resolvers })

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
})
