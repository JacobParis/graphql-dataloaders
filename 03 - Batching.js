/**
 * Lesson 03 - Batching
 * 
 * Batching is a second layer of abstraction
 * where instead of resolving requests immediately, we pause for a bit
 * 
 * And then we take every ID that was requested over that pause
 * and do one single query for all of them
 * 
 * Lets call that "activeQuery" and make it null by default.
 * 
 * To pause, we need to make a new Promise with a short timeout
 * 1 millisecond is ok here. Longer will allow bigger batches
 * but it will also make the requests slower.
 * 
 * Our batch size will be every ID in the promises cache, which 
 * gets us everything requested so far
 * 
 * Bring the database query code here, and we'll tweak it to accept
 * a list of IDs instead of just a single one
 * 
 * That's going to be Select all from users where id in "ids"
 * 
 * .where becomes .whereIn, and pass it all the IDs from the promiseCache
 * 
 * We don't just want the first item anymore, so we can remove .first()
 * and this becomes the activeQuery instead
 * 
 * If we're fetching the list of IDs from the cache, then we're going to
 * be missing the current one if it's not a cache hit. Lots of ways to
 * fix that, I'll just add it to the cache and be done with it
 * 
 * So the promise for each item key is going to start with the common
 * activeQuery (which returns every item in this batch) and then branch
 * off to find and return the specific ID for this item
 * 
 * Now we resolve the promise for this key, which is being returned
 * from the load method for this key.
 * 
 * Last thing – once this batch has started, we don't need to dispatch it again
 * so only do that if we haven't set activeQuery yet
 * 
 * Lets test this out
 * 
 * One request for posts, and one request for all of the users at once. Before,
 * 1000 posts would do 1000 individual author requests. Now it will be 1 request
 * no matter how many posts we have
 * 
 * Running this a second time shows our cache still works across multiple network requests
 * 
 * Since there's no guarantee those requests come from the same person,
 * That means a logged-in user could cache some sensitive data that guest
 * users could access by mistake
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
  load(key) {
    if (this.promises[key]) {
      // We've queried this before, return the cached promise
      return this.promises[key]
    } else {
      // Just a placeholder until the batch is ready to go
      this.promises[key] = null
    }

    return new Promise((resolve) => {
      // Wait until the batch is ready
      // Increase the timeout to make larger, slower batches
      setTimeout(() => {
        if (!this.activeQuery) {
          // Query all IDs at once
          const ids = Object.keys(this.promises)
          console.log(`SELECT * from users WHERE id in (${ids.join(',')})`)

          this.activeQuery = sql
            .select('*')
            .from('users')
            .whereIn('id', ids)
        }

        // Cache a promise that waits on the active query
        this.promises[
          key
        ] = this.activeQuery.then((items) => {
          // And selects the item with this id
          return items.find((item) => item.id === Number(key))
        })

        resolve(this.promises[key])
      }, 1)
    })
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
