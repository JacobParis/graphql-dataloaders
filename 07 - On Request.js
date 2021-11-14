/**
 * Lesson 07 - On Request
 * 
 * Right now we're creating "userLoader" when the server starts
 * and we don't have any code to purge the cache between requests
 * 
 * So a second query for the same item is still served from the cache
 * 
 * Network caches like this are a good idea, but this is not
 * the place for them. Server RAM is expensive and this implementation
 * poses major security risks
 * 
 * We can eliminate all of that by using a cache that only exists for
 * the duration of a single network request
 * 
 * We're going to do that by making new DataLoaders on every request
 * using Apollo's context method
 * 
 * Copy the userLoader directly from its declaration into the Apollo context
 * 
 * And it will be available as the third argument to every single resolver
 * 
 * Now we can see the caching and batching working flawlessly on a per-request level
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

class DataLoader {
  constructor(batchFn, options = {}) {
    this.batchFn = batchFn

    if(options.schedulingFn) {
      this.schedulingFn = options.schedulingFn
    }

    this.promises = {}
    this.activeQuery = null
  }

  batchFn() {
    throw new Error('Not implemented')
  }

  schedulingFn() {
    // Wait until the batch is ready
    // Increase the timeout to make larger, slower batches
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve()
      })
    })
  }

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
  }
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
    async author(post, args, { userLoader }) {
      // Executes once per post per query
      return userLoader.load(post.author_id)
    },
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  async context() {
    return {
      userLoader: new DataLoader(keys => sql
        .select('*')
        .from('users')
        .whereIn('id', keys)
      )
    }
  }
})

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
})
