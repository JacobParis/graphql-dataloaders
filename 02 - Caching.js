
/**
 * Lesson 02 - Caching
 * 
 * To implement a cache, we need to add a layer of abstraction
 * between the resolver and the database request.
 * 
 * That "cache layer" is responsible for deciding whether
 * a request actually queries the database or just returns
 * a cached value.
 * 
 * Lets create an object named "cache" with a method named load
 * and copy/paste the database request from the author resolver
 * 
 * Then the author resolver can call cache.load with the author_id
 * and everything should work just like it did before
 * 
 * We can send the same request multiple times and it still hits the
 * database every time.
 * 
 * We'll give the cache a "promises" object that will work like a Map or Dictionary
 * The keys in the object are the user IDs we've tried to load, and the values
 * are the database request for that user ID
 * 
 * So we can guard this function with a check to see if promises object
 * already contains this key, and if so, return the promise from the cache
 * 
 * If it doesn't, then we add the database request to the cache
 * and return it
 * 
 * Just to make it easier to see what's going on, we'll add a console.log
 * Cache hit for "key"
 * 
 * If we query the posts now, we can see that every user that
 * was called more than once, responds first from the database,
 * and then from the cache.
 * 
 * That's users 1, 2, and 4; and no database entry is called twice. That's good!
 * 
 * If we send a second request, every user is served from the cache
 * and will continue to be until the server restarts. 
 * 
 * That's bad – But we'll fix that shortly
 * 
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
  load(key) {
    if (this.promises[key]) {
      // We've queried this before, return the cached promise
      return this.promises[key]
    }
    // Otherwise, run the query and cache the result
    // Now only executes on unique users
    this.promises[key] = sql
      .select('*')
      .from('users')
      .where('id', key)
      .first()
      
    console.log('SELECT * from users WHERE id =', key)

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
