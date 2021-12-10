
/**
 * Lesson 01 - Individual requests for each item
 * 
 * This is an Apollo GraphQL application with a PostGRES database
 * that contains a table of posts and a table of users
 *  
 * We have a posts query that returns an array of Posts
 * And a users query that returns an array of Users
 * 
 * Lets query the posts, and we can see every item
 * in the database is returned
 * 
    query {
      posts {
        id
        title
      }
    }
 *
 * And the users query does the same for the users
 * 
    query {
      users {
        id
        name
      }
    }
 * 
 * So what we're looking to accomplish here is to
 * extend the Post query to also return the user
 * who wrote the post
 * 
 * We can start by adding a new field to the schema
 * named author with a return type of User 
 * 
 * Then if we scroll down to the resolvers section
 * for the "Post" type and add an "author" field
 * 
 * We'll return a list of "users" where the id matches the post's "author_id"
 * and since we only want one, grab the first one from the array
 *
 * Lets try that request out, with the author, ID, and name
 * 
    query {
      posts {
        id
        title
        author {
          id
          name
        }
      }
    }
 * 
 * And we get all the author information for each post
 * 
 * It's a little hard to tell what the database is actually doing here
 * So we'll add some console logs to track how many times
 * we're interacting with the database
 * 
 * Under "posts", we'll do console log, select all from posts
 * 
 * And under "author" we'll do console log, select all from users
 * where id = post.author_id
 * 
 * If we run our request again, we can see that we're only making
 * one database request to fetch the list of posts
 * 
 * But we're also making individual requests for the author on each post
 * Including several requests for the same author
 * 
 * At the end of this series, we'll show how to use Data Loaders
 * for caching and batching database operations so that we can 
 * serve all of these results with only one database request
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
      console.log('SELECT * from users WHERE id =', post.author_id)

      return sql
        .select('*')
        .from('users')
        .where('id', post.author_id)
        .first()
    },
  },
}

const server = new ApolloServer({ typeDefs, resolvers })

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
})
