/**
 * Lesson 12 - Comment Count Loader
 *
 * If users will be querying the number of comments often without also querying the list of comments
 *
 * Then fetching the entire comment table is wasteful. It's also not compatible
 * with any pagination we might add later, since we still need the total count
 *
 * We can give it a dedicated commentCountByPostIdLoader
 * that selects (post_id)
 * counts post_id
 * groups by post_id
 * where post id is in keys
 *
 * Then maps each key to the the count for that post ID or zero if there were none
 *
 * Update the resolver to use the new loader, and you can run the query again
 * but it will show the same output as before.
 */
const { ApolloServer, gql } = require("apollo-server")
const DataLoader = require("dataloader")

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
      console.log("SELECT * from posts")
      return sql("posts").select("*")
    },
    post(parent, { id }, { postLoader }) {
      // Executes once per query
      return postLoader.load(id)
    },
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

    commentCount(post, args, { commentsByPostIdCountLoader }) {
      return commentsByPostIdCountLoader.load(post.id)
    },
  },

  Comment: {
    async author(post, args, { userLoader }) {
      // Executes once per comment per post per query
      return userLoader.load(post.author_id)
    },
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  async context() {
    return {
      userLoader: new DataLoader((keys) =>
        sql.select("*").from("users").whereIn("id", keys)
      ),
      postLoader: new DataLoader((keys) =>
        sql.select("*").from("posts").whereIn("id", keys)
      ),
      commentsByPostIdLoader: new DataLoader((postIds) =>
        sql
          .select("*")
          .from("comments")
          .whereIn("post_id", postIds)
          .then((comments) =>
            postIds.map((postId) =>
              comments.filter((comment) => comment.post_id === postId)
            )
          )
      ),
      commentsByPostIdCountLoader: new DataLoader((postIds) =>
        sql("comments")
          .select("post_id")
          .count("post_id")
          .groupBy("post_id")
          .whereIn("post_id", postIds)
          .then((counts) =>
            postIds.map((postId) => {
              const count = counts.find((count) => count.post_id === postId)

              return count ? count.count : 0
            })
          )
      ),
    }
  },
})

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`)
})
