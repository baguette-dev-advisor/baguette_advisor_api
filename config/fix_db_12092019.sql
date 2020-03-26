DROP TABLE refresh;
DROP TABLE rating;
DROP TABLE product;
DROP TABLE marketpoint;
DROP TABLE users;
DROP TYPE roles;
DROP TYPE moderation;
CREATE TYPE roles AS ENUM ('admin','moderator','user');
CREATE TYPE moderation AS ENUM ('unreviewed','whitelisted','blacklisted');
CREATE TABLE users (
  id            UUID PRIMARY KEY,
  username      TEXT,
  ukey          TEXT UNIQUE,
  mail          TEXT,
  mkey          TEXT UNIQUE,
  password      TEXT,
  avatar        TEXT,
  role          roles,
  active	      BOOLEAN,
  creation_ts   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_ts     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE marketpoint (
  id          UUID    PRIMARY KEY,
  location    GEOMETRY,
  name        TEXT,
  picture     TEXT,
  upvotes     INT DEFAULT 0,
  downvotes   INT DEFAULT 0,
  upvotes_save     INT DEFAULT 0,
  downvotes_save   INT DEFAULT 0,
  status      moderation,
  hunter      UUID references users(id),
  creation_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_ts   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE product (
  id                UUID PRIMARY KEY,
  name          TEXT,
  UNIQUE (name, marketpoint),
  upvotes       INT DEFAULT 0,
  downvotes   INT DEFAULT 0,
  marketpoint UUID references marketpoint(id),
  creation_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_ts   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE rating (
  id          UUID PRIMARY KEY,
  rating      INT,
  status      moderation,
  rater       UUID references users(id),
  marketpoint UUID references marketpoint(id),
  product UUID references product(id),
  UNIQUE (rater, marketpoint, product),
  creation_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_ts   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE refresh (
  id          UUID PRIMARY KEY,
  token       TEXT,
  user_id     TEXT,
  role        roles,
  creation_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_ts   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   IF row(NEW.*) IS DISTINCT FROM row(OLD.*) THEN
      NEW.update_ts = now(); 
      RETURN NEW;
   ELSE
      RETURN OLD;
   END IF;
END;
$$ language 'plpgsql';
CREATE TRIGGER update_ts_trigger BEFORE UPDATE ON users       FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_ts_trigger BEFORE UPDATE ON marketpoint FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_ts_trigger BEFORE UPDATE ON rating      FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_ts_trigger BEFORE UPDATE ON product      FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_ts_trigger BEFORE UPDATE ON refresh     FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
