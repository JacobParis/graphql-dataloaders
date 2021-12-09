/**
 * Lesson 06 - Refactor Class
 *
 * One way to make the batch function configurable is to turn this into a class
 *
 * So we can have a userLoader instance and a postLoader instance and the only
 * difference is they pass different batch function parameters when we construct them
 *
 * Rename the cache to "class DataLoader" and in the constructor
 * assign promises and activeQuery as member variables
 *
 * Set the batch function here too, from an argument to the constructor
 *
 * and then the scheduling function is optional so we'll hide that behind
 * an options object
 *
 * There's no default batch function, so throw an error unless we've overridden it
 *
 * Now we can create userLoader as a new DataLoader
 * pass in a batch function that takes keys
 * select all
 * from users
 * where id in (keys)
 *
 * Replace the old cache load call with the userLoader call and try it out!
 *
 * Looks like everything still works and the refactor was successful
 */
const { ApolloServer, gql } = require("apollo-server")

const sql = require("knex")({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: "password",
    database: "postgres",
  },
})

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

    if (options.schedulingFn) {
      this.schedulingFn = options.schedulingFn
    }

    this.promises = {}
    this.activeQuery = null
  }

  batchFn() {
    throw new Error("Not implemented")
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
      console.log(`SELECT * from users WHERE id in (${ids.join(",")})`)

      this.activeQuery = this.batchFn(ids)
    }

    // Cache a promise that waits on the active query
    this.promises[key] = this.activeQuery.then((items) => {
      // And selects the item with this id
      return items.find((item) => item.id === Number(key))
    })

    return this.promises[key]
  }
}

const userLoader = new DataLoader((keys) =>
  sql.select("*").from("users").whereIn("id", keys)
)

const resolvers = {
  Query: {
    posts() {
      // Executes once per query
      console.log("SELECT * from posts")
      return sql("posts").select("*")
    },
  },
  Post: {
    async author(post) {
      // Executes once per post per query
      return userLoader.load(post.author_id)
    },
  },
}

const server = new ApolloServer({ typeDefs, resolvers })

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`)
})
