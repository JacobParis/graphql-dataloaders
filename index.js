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
      console.log("SELECT * from users WHERE id =", post.author_id)

      return sql.select("*").from("users").where("id", post.author_id).first()
    },
  },
}

const server = new ApolloServer({ typeDefs, resolvers })

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`)
})
