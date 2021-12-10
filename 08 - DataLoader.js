/**
 * Lesson 08 - DataLoader
 *
 * We've now built a functional DataLoader step-by-step showing exactly
 * why each step is needed. This API is very close to the official DataLoader
 * package maintained by the GraphQL Foundation
 *
 * Which we can install with `npm install --save dataloader`
 *
 * Import the DataLoader package
 * const dataloader = require dataloader
 *
 * Delete the big class we wrote
 *
 * And now we're using the DataLoader package for our userLoader
 *
 * Test the code again, and it looks like all the results are still returning
 * correctly
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
 */
const { ApolloServer, gql } = require("apollo-server");
const DataLoader = require("dataloader");

const sql = require("knex")({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: "password",
    database: "postgres",
  },
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
`;

const resolvers = {
  Query: {
    posts() {
      // Executes once per query
      console.log("SELECT * from posts");
      return sql("posts").select("*");
    },
  },
  Post: {
    async author(post, args, { userLoader }) {
      // Executes once per post per query
      return userLoader.load(post.author_id);
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  async context() {
    return {
      userLoader: new DataLoader((keys) => {
        console.log(`SELECT * from users WHERE id in (${keys.join(",")})`);

        return sql.select("*").from("users").whereIn("id", keys);
      }),
    };
  },
});

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
