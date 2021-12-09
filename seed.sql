\ c template1;

DROP DATABASE IF EXISTS postgres;

CREATE DATABASE postgres;

\ c postgres;

CREATE TABLE IF NOT EXISTS users (id VARCHAR PRIMARY KEY, name VARCHAR);

INSERT INTO
  users (id, name)
VALUES
  ('1', 'Alice'),
  ('2', 'Beatrice'),
  ('4', 'Carl'),
  ('5', 'Darcy');

CREATE TABLE IF NOT EXISTS posts (
  id VARCHAR PRIMARY KEY,
  title VARCHAR,
  author_id VARCHAR REFERENCES users(id)
);

INSERT INTO
  posts (id, author_id, title)
VALUES
  (
    '1',
    '1',
    'A Beautiful Mind: This Woman Is Able To Vividly Imagine Every Single Bad Thing That Could Possibly Happen To Her In The Future'
  ),
  (
    '2',
    '1',
    'Ready To Feel Old?! The Deadline You Set For Yourself To Quit Your Job And Finally Start Living On Your Own Terms Already Passed Three Years Ago!'
  ),
  (
    '3',
    '2',
    'Risky Move: This Guy Posted An Open Invitation On Facebook For Anyone Who Wants To Go To A Concert With Him'
  ),
  (
    '4',
    '2',
    'Taking One For The Team: This Man Was The One Who Had To Go Out And Select The Birthday Card Everyone In The Office Had To Sign'
  ),
  (
    '5',
    '4',
    'Yay! The CDC Just Caved And Said You Don"t Have To Wash Your Hands On Your Birthday'
  ),
  (
    '6',
    '4',
    'Is That Even Allowed? This Wizard Has A Pistol'
  ),
  (
    '7',
    '5',
    'Stolen Valor: This Man Is Wearing A Toupee Despite Having Floor-Length Golden Hair'
  );

CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR PRIMARY KEY,
  text VARCHAR,
  post_id VARCHAR REFERENCES posts(id),
  author_id VARCHAR REFERENCES users(id)
);

INSERT INTO
  comments (id, post_id, author_id, text)
VALUES
  ('1', '4', '1', 'First!'),
  ('2', '4', '2', 'This is great'),
  ('3', '4', '1', 'First!'),
  ('4', '4', '4', 'Double post, my bad'),
  ('5', '5', '1', 'text'),
  (
    '6',
    '4',
    '1',
    'This has been on my mind for a while'
  ),
  ('7', '7', '1', 'text');