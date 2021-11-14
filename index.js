const { ApolloServer, gql } = require('apollo-server')
const DataLoader = require('dataloader')

const sql = require('knex')({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    port : 5432,
    user : 'postgres',
    password : 'password',
    database : 'postgres'
  }
})

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = gql`
  type Query {
    posts: [Post]
    users: [User]
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
      console.log('SELECT * FROM posts')

      return sql('posts').select('*')
    },
    
    post(root, { id }, { postLoader }) {
      // Executes once per query

      return postLoader.load(id)
    },

    users() {
      // Executes once per query
      return sql('users').select('*')
    }
  },

  Post: {
    author(post, args, { userLoader }) {
      return userLoader.load(post.author_id)
    },

    comments(post, args, { commentsByPostIdLoader }) {
      return commentsByPostIdLoader.load(post.id)
    },

    commentCount(post, args, { commentCountByPostIdLoader }) {
      return commentCountByPostIdLoader.load(post.id)
    },
  },

  Comment: {
    author(post, args, { userLoader }) {
      return userLoader.load(post.author_id)
    },
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context() {
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
      commentsByPostIdLoader: new DataLoader(keys => sql
        .select('*')
        .from('comments')
        .whereIn('post_id', keys)
        .then(comments => keys.map(key => comments.filter(comment => comment.post_id === key)))
      ),
      commentCountByPostIdLoader: new DataLoader(postIds => sql('comments')
        .select('post_id')
        .count("post_id")
        .groupBy("post_id")
        .whereIn('post_id', postIds)
        .then(counts => postIds.map(postId => {
          const count = counts.find(count => count.post_id === postId)
          
          return count ? count.count : 0
        }))
      )
    }
  }})

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
})
