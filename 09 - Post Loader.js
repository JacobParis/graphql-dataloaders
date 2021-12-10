/**
 * Lesson 09 - Add a post loader
 *
 * Lets take advantage of the reusability of the dataloader
 *
 * and clone our userLoader to make a postLoader
 *
 * Make a post resolver that takes an ID as an argument,
 * and calls postLoader.load
 *
 * Then to the schema, add post, id String, returning a Post
 *
 * And now try that new query out
 *
 * Look at ID 2 here, we'll try to query that one specifically
 *
 *
    query {
      post(id: "2") {
        id
        title
        author {
          id
          name
        }
      }
    }
 * 
 * Now give ID 3 a shot
 *
    query {
      post(id: "3") {
        id
        title
        author {
          id
          name
        }
      }
    }
 * 
 * And everything is working wonderfully
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
    post(id: String): Post
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
    post(parent, { id }, { postLoader }) {
      // Executes once per query
      return postLoader.load(id);
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
      userLoader: new DataLoader((keys) =>
        sql.select("*").from("users").whereIn("id", keys)
      ),
      postLoader: new DataLoader((keys) =>
        sql.select("*").from("posts").whereIn("id", keys)
      ),
    };
  },
});

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
