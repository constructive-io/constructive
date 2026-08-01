--
-- PostgreSQL database dump
--

\restrict Rhcdwy2WGDhj9Q1hKGNyv7beFEsbwg6bGgxjVYIVY9511ICWws8BXfu2kIXtqFa

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: imp_app; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA imp_app;


ALTER SCHEMA imp_app OWNER TO postgres;

--
-- Name: SCHEMA imp_app; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA imp_app IS 'Application schema';


--
-- Name: imp_audit; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA imp_audit;


ALTER SCHEMA imp_audit OWNER TO postgres;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: touch(); Type: FUNCTION; Schema: imp_app; Owner: postgres
--

CREATE FUNCTION imp_app.touch() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.created_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION imp_app.touch() OWNER TO postgres;

--
-- Name: FUNCTION touch(); Type: COMMENT; Schema: imp_app; Owner: postgres
--

COMMENT ON FUNCTION imp_app.touch() IS 'touch trigger fn';


--
-- Name: order_seq; Type: SEQUENCE; Schema: imp_app; Owner: postgres
--

CREATE SEQUENCE imp_app.order_seq
    START WITH 100
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE imp_app.order_seq OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: orders; Type: TABLE; Schema: imp_app; Owner: postgres
--

CREATE TABLE imp_app.orders (
    id integer DEFAULT nextval('imp_app.order_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    note text
);


ALTER TABLE imp_app.orders OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: imp_app; Owner: postgres
--

CREATE TABLE imp_app.users (
    id integer NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE imp_app.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: imp_app; Owner: postgres
--

COMMENT ON TABLE imp_app.users IS 'App users';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: imp_app; Owner: postgres
--

COMMENT ON COLUMN imp_app.users.email IS 'Login email';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: imp_app; Owner: postgres
--

CREATE SEQUENCE imp_app.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE imp_app.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: imp_app; Owner: postgres
--

ALTER SEQUENCE imp_app.users_id_seq OWNED BY imp_app.users.id;


--
-- Name: events; Type: TABLE; Schema: imp_audit; Owner: postgres
--

CREATE TABLE imp_audit.events (
    id integer NOT NULL,
    user_id integer,
    detail text
);


ALTER TABLE imp_audit.events OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: imp_audit; Owner: postgres
--

CREATE SEQUENCE imp_audit.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE imp_audit.events_id_seq OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: imp_audit; Owner: postgres
--

ALTER SEQUENCE imp_audit.events_id_seq OWNED BY imp_audit.events.id;


--
-- Name: users id; Type: DEFAULT; Schema: imp_app; Owner: postgres
--

ALTER TABLE ONLY imp_app.users ALTER COLUMN id SET DEFAULT nextval('imp_app.users_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: imp_audit; Owner: postgres
--

ALTER TABLE ONLY imp_audit.events ALTER COLUMN id SET DEFAULT nextval('imp_audit.events_id_seq'::regclass);


--
-- Data for Name: orders; Type: TABLE DATA; Schema: imp_app; Owner: postgres
--

COPY imp_app.orders (id, user_id, note) FROM stdin;
100	1	first\torder
101	2	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: imp_app; Owner: postgres
--

COPY imp_app.users (id, email, created_at) FROM stdin;
1	a@example.com	2026-07-31 22:53:49.879981+00
2	b@example.com	2026-07-31 22:53:49.879981+00
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: imp_audit; Owner: postgres
--

COPY imp_audit.events (id, user_id, detail) FROM stdin;
\.


--
-- Name: order_seq; Type: SEQUENCE SET; Schema: imp_app; Owner: postgres
--

SELECT pg_catalog.setval('imp_app.order_seq', 101, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: imp_app; Owner: postgres
--

SELECT pg_catalog.setval('imp_app.users_id_seq', 2, true);


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: imp_audit; Owner: postgres
--

SELECT pg_catalog.setval('imp_audit.events_id_seq', 1, false);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: imp_app; Owner: postgres
--

ALTER TABLE ONLY imp_app.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: imp_app; Owner: postgres
--

ALTER TABLE ONLY imp_app.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: imp_app; Owner: postgres
--

ALTER TABLE ONLY imp_app.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: imp_audit; Owner: postgres
--

ALTER TABLE ONLY imp_audit.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: orders_user_idx; Type: INDEX; Schema: imp_app; Owner: postgres
--

CREATE INDEX orders_user_idx ON imp_app.orders USING btree (user_id);


--
-- Name: users users_touch; Type: TRIGGER; Schema: imp_app; Owner: postgres
--

CREATE TRIGGER users_touch BEFORE UPDATE ON imp_app.users FOR EACH ROW EXECUTE FUNCTION imp_app.touch();


--
-- Name: orders orders_user_fk; Type: FK CONSTRAINT; Schema: imp_app; Owner: postgres
--

ALTER TABLE ONLY imp_app.orders
    ADD CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES imp_app.users(id);


--
-- Name: events events_user_id_fkey; Type: FK CONSTRAINT; Schema: imp_audit; Owner: postgres
--

ALTER TABLE ONLY imp_audit.events
    ADD CONSTRAINT events_user_id_fkey FOREIGN KEY (user_id) REFERENCES imp_app.users(id);


--
-- Name: users; Type: ROW SECURITY; Schema: imp_app; Owner: postgres
--

ALTER TABLE imp_app.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_select; Type: POLICY; Schema: imp_app; Owner: postgres
--

CREATE POLICY users_select ON imp_app.users FOR SELECT USING (true);


--
-- Name: SCHEMA imp_app; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA imp_app TO PUBLIC;


--
-- Name: TABLE orders; Type: ACL; Schema: imp_app; Owner: postgres
--

GRANT SELECT,INSERT ON TABLE imp_app.orders TO PUBLIC;


--
-- Name: TABLE users; Type: ACL; Schema: imp_app; Owner: postgres
--

GRANT SELECT ON TABLE imp_app.users TO PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict Rhcdwy2WGDhj9Q1hKGNyv7beFEsbwg6bGgxjVYIVY9511ICWws8BXfu2kIXtqFa

