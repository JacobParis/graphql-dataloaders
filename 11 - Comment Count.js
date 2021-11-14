/**
 * Lesson 11 - Comment count
 * 
 * If we want to count the comments for each post, the simplest way is to reuse
 * our existing comment loader and simply grab the length of the array that it returns
 * 
 * Lets add that to the schema, returning an Int, and then test the query out
 * 
 * Getting a few zeroes and a 5, so the count is being returned correctly
 * 
 * If we are always going query both "commentCount" and the list of "comments" at the same time,
 * the DataLoader will batch them together and we essentially get the count for free
 * with no extra database requests
 */

const { ApolloServer, gql } = require('apollo-server')
const DataLoader = require('dataloader');

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
    post(id: String): Post
  }

  type Post {
    id: String
    title: String
    author: User
    comments: [Comment]
    commentCount: Int
  }

  type User {
    id: String
    name: String
  }

  type Comment {
    id: String
    text: String
    author: User
  }
`

const resolvers = {
  Query: {
    posts() {
      // Executes once per query
      console.log('SELECT * from posts')
      return sql('posts').select('*')
    },
    post(parent, { id }, { postLoader }) {
      // Executes once per query
      return postLoader.load(id)
    }
  },
  Post: {
    async author(post, args, { userLoader }) {
      // Executes once per post per query
      return userLoader.load(post.author_id)
    },

    async comments(post, args, { commentsByPostIdLoader }) {
      // Executes once per post per query
      return commentsByPostIdLoader.load(post.id)
    },

    async commentCount(post, args, { commentsByPostIdLoader }) {
      return commentsByPostIdLoader
        .load(post.id)
        .then(comments => comments.length)
    }
  },

  Comment: {
    async author(post, args, { userLoader }) {
      // Executes once per comment per post per query
      return userLoader.load(post.author_id)
    },
  }
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
      ),
      postLoader: new DataLoader(keys => sql
        .select('*')
        .from('posts')
        .whereIn('id', keys)
      ),
      commentsByPostIdLoader: new DataLoader(postIds => sql
        .select('*')
        .from('comments')
        .whereIn('post_id', postIds)
        .then(comments => postIds.map(postId => comments.filter(comment => comment.post_id === postId)))
      )
    }
  }
})

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
})
