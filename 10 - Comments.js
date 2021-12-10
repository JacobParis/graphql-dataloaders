/**
 * Lesson 10 - Comments
 *
 * What's next?
 *
 * Lets add a new loader to fetch all the comments for a given post Id
 *
 * Select all
 * from comments
 * where, post id is in the keys
 *
 * then we want to replace each key (each post_id) with an array of all the comments for that post
 *
 * Under the Post resolvers add one for comments which uses the new comments by post id loader
 *
 * return commentsByPostIdLoader.load(post.id)
 *
 * Next we'll add the comments field to the Post schema, which returns an array of Comments
 * and then the Comment type which has an id, text, and an author field
 *
 * We also need to resolve that author field on the Comment type, which we can copy paste from
 * the Post type
 *
 * Lets try querying the posts, we'll get all their comments
 * and each id, text, author id, and author name
 *
    query {
      posts {
        id
        comments {
          id
          text
          author {
            id
            name
          }
        }
      }
    }
 * 
 * No comments for the first few, looks like 5 comments on this one, 2 comments here
 *
 * All the information is right where it's supposed to be
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
    comments: [Comment]
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

    async comments(post, args, { commentsByPostIdLoader }) {
      // Executes once per post per query
      return commentsByPostIdLoader.load(post.id);
    },
  },

  Comment: {
    async author(post, args, { userLoader }) {
      // Executes once per comment per post per query
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
    };
  },
});

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
