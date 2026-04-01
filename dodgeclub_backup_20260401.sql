--
-- PostgreSQL database dump
--

\restrict PxQbQDwniZFJjQLfPhdXQdeZbkkQNHEiZsyJAV8KhjyW8dqtkxFeBrdq51MMrFm

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: stripe; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA stripe;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    sent_count integer DEFAULT 0 NOT NULL,
    sent_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id integer NOT NULL,
    user_id integer NOT NULL,
    event_id integer NOT NULL,
    earned_medal boolean DEFAULT false NOT NULL,
    attended_at timestamp without time zone DEFAULT now() NOT NULL,
    checkin_method text
);


--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: awards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.awards (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type text NOT NULL,
    note text,
    awarded_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: awards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.awards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: awards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.awards_id_seq OWNED BY public.awards.id;


--
-- Name: discount_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_codes (
    id integer NOT NULL,
    event_id integer,
    code text NOT NULL,
    discount_type text NOT NULL,
    discount_amount integer NOT NULL,
    max_uses integer,
    uses_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: discount_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.discount_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: discount_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.discount_codes_id_seq OWNED BY public.discount_codes.id;


--
-- Name: event_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_registrations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    event_id integer NOT NULL,
    registered_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: event_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_registrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_registrations_id_seq OWNED BY public.event_registrations.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    date timestamp without time zone NOT NULL,
    location text NOT NULL,
    ticket_url text,
    image_url text,
    attendee_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    ticket_price numeric(10,2),
    ticket_capacity integer,
    stripe_product_id text,
    stripe_price_id text,
    checkout_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    waiver_text text,
    elite_early_access boolean DEFAULT false NOT NULL,
    elite_discount_percent integer,
    xp_reward integer DEFAULT 50 NOT NULL,
    check_in_pin text,
    email_subject text,
    email_header_image_url text,
    email_body_text text,
    email_cta_text text,
    email_cta_url text,
    gift_email_subject text,
    gift_email_header_image_url text,
    gift_email_body_text text,
    gift_email_cta_text text,
    gift_email_cta_url text,
    email_video_url text,
    gift_email_video_url text
);


--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: merch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merch (
    id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    price numeric(10,2) NOT NULL,
    image_url text,
    buy_url text,
    category text DEFAULT 'apparel'::text NOT NULL,
    in_stock boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: merch_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.merch_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: merch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.merch_id_seq OWNED BY public.merch.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id integer NOT NULL,
    receiver_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    read_at timestamp without time zone
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    email text NOT NULL,
    code text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: post_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_comments (
    id integer NOT NULL,
    post_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: post_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.post_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: post_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.post_comments_id_seq OWNED BY public.post_comments.id;


--
-- Name: post_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_reports (
    id integer NOT NULL,
    post_id integer NOT NULL,
    reported_by_user_id integer NOT NULL,
    reason text,
    resolved boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: post_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.post_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: post_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.post_reports_id_seq OWNED BY public.post_reports.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    image_url text,
    is_members_only boolean DEFAULT false NOT NULL,
    author_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_elite_only boolean DEFAULT false NOT NULL
);


--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: streak_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.streak_notifications (
    id integer NOT NULL,
    event_id integer NOT NULL,
    user_id integer NOT NULL,
    sent_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: streak_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.streak_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: streak_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.streak_notifications_id_seq OWNED BY public.streak_notifications.id;


--
-- Name: team_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    team_name text NOT NULL,
    season text NOT NULL,
    role_in_team text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: team_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_history_id_seq OWNED BY public.team_history.id;


--
-- Name: ticket_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_types (
    id integer NOT NULL,
    event_id integer NOT NULL,
    name text NOT NULL,
    description text,
    price integer DEFAULT 0 NOT NULL,
    quantity integer,
    quantity_sold integer DEFAULT 0 NOT NULL,
    sale_starts_at timestamp without time zone,
    sale_ends_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    stripe_product_id text,
    stripe_price_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    max_per_order integer
);


--
-- Name: ticket_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ticket_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ticket_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ticket_types_id_seq OWNED BY public.ticket_types.id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    user_id integer NOT NULL,
    event_id integer NOT NULL,
    stripe_payment_intent_id text,
    stripe_checkout_session_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    ticket_code text NOT NULL,
    checked_in boolean DEFAULT false NOT NULL,
    checked_in_at timestamp without time zone,
    amount_paid integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    checkout_data jsonb,
    gift_recipient_email text,
    ticket_type_id integer,
    discount_code_id integer,
    original_amount_paid integer
);


--
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- Name: user_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_blocks (
    id integer NOT NULL,
    blocker_id integer NOT NULL,
    blocked_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: user_blocks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_blocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_blocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_blocks_id_seq OWNED BY public.user_blocks.id;


--
-- Name: user_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_reports (
    id integer NOT NULL,
    reported_user_id integer NOT NULL,
    reported_by_user_id integer NOT NULL,
    reason text,
    resolved boolean DEFAULT false NOT NULL,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: user_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_reports_id_seq OWNED BY public.user_reports.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    duration integer NOT NULL,
    started_at timestamp without time zone NOT NULL,
    ended_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    avatar_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    username text,
    preferred_role text,
    bio text,
    push_token text,
    notifications_enabled boolean DEFAULT false NOT NULL,
    stripe_customer_id text,
    last_seen_at timestamp without time zone,
    is_elite boolean DEFAULT false NOT NULL,
    stripe_subscription_id text,
    elite_since timestamp without time zone,
    bonus_xp integer DEFAULT 0 NOT NULL,
    game_xp integer DEFAULT 0 NOT NULL,
    member_since timestamp without time zone,
    account_type text DEFAULT 'player'::text NOT NULL,
    referral_code text,
    referred_by integer,
    is_banned boolean DEFAULT false NOT NULL,
    skills text,
    google_id text,
    elite_xp_awarded boolean DEFAULT false NOT NULL,
    pending_elite_celebration boolean DEFAULT false NOT NULL,
    pending_elite_xp_awarded boolean DEFAULT false NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.videos (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    url text NOT NULL,
    thumbnail_url text,
    is_published boolean DEFAULT false NOT NULL,
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: videos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.videos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: videos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.videos_id_seq OWNED BY public.videos.id;


--
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: awards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards ALTER COLUMN id SET DEFAULT nextval('public.awards_id_seq'::regclass);


--
-- Name: discount_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes ALTER COLUMN id SET DEFAULT nextval('public.discount_codes_id_seq'::regclass);


--
-- Name: event_registrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations ALTER COLUMN id SET DEFAULT nextval('public.event_registrations_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: merch id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merch ALTER COLUMN id SET DEFAULT nextval('public.merch_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: post_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments ALTER COLUMN id SET DEFAULT nextval('public.post_comments_id_seq'::regclass);


--
-- Name: post_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reports ALTER COLUMN id SET DEFAULT nextval('public.post_reports_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: streak_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streak_notifications ALTER COLUMN id SET DEFAULT nextval('public.streak_notifications_id_seq'::regclass);


--
-- Name: team_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_history ALTER COLUMN id SET DEFAULT nextval('public.team_history_id_seq'::regclass);


--
-- Name: ticket_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_types ALTER COLUMN id SET DEFAULT nextval('public.ticket_types_id_seq'::regclass);


--
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- Name: user_blocks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks ALTER COLUMN id SET DEFAULT nextval('public.user_blocks_id_seq'::regclass);


--
-- Name: user_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports ALTER COLUMN id SET DEFAULT nextval('public.user_reports_id_seq'::regclass);


--
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: videos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos ALTER COLUMN id SET DEFAULT nextval('public.videos_id_seq'::regclass);


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.announcements (id, title, body, sent_count, sent_by, created_at) FROM stdin;
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance (id, user_id, event_id, earned_medal, attended_at, checkin_method) FROM stdin;
82	83	43	f	2026-03-27 19:24:58.732927	scan
83	107	45	f	2026-03-31 16:54:46.967475	scan
\.


--
-- Data for Name: awards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.awards (id, user_id, type, note, awarded_at) FROM stdin;
103	83	ring	\N	2026-03-26 10:55:50.474067
108	83	medal	\N	2026-03-26 10:55:54.356276
114	107	medal	\N	2026-03-31 16:40:42.231939
115	107	ring	\N	2026-03-31 16:40:43.517774
\.


--
-- Data for Name: discount_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.discount_codes (id, event_id, code, discount_type, discount_amount, max_uses, uses_count, expires_at, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: event_registrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_registrations (id, user_id, event_id, registered_at) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.events (id, title, description, date, location, ticket_url, image_url, attendee_count, created_at, is_published, ticket_price, ticket_capacity, stripe_product_id, stripe_price_id, checkout_fields, waiver_text, elite_early_access, elite_discount_percent, xp_reward, check_in_pin, email_subject, email_header_image_url, email_body_text, email_cta_text, email_cta_url, gift_email_subject, gift_email_header_image_url, gift_email_body_text, gift_email_cta_text, gift_email_cta_url, email_video_url, gift_email_video_url) FROM stdin;
44	March Mayhem	Dodgeball	2026-04-21 08:30:00	london	\N	/api/storage/objects/uploads/ee1a2dfd-ab6a-445c-85e0-fc520b018039	0	2026-03-27 16:12:36.566365	t	\N	\N	\N	\N	[{"id": "custom_1774441599580", "type": "text", "label": "Name", "required": true}, {"id": "custom_1774441613588", "type": "text", "label": "Surname", "required": true}, {"id": "custom_1774441622276", "type": "email", "label": "Email", "required": true}, {"id": "custom_1774824330088", "type": "yes_no", "label": "Have to you attended TDC before?", "required": true}]	THE DODGE CLUB – WAIVER AND RELEASE OF LIABILITY\nPLEASE READ CAREFULLY BEFORE SIGNING\n\nBy attending or participating in The Dodge Club dodgeball event, I acknowledge and agree to the following terms:\n\n1. Assumption of Risk (Players & Spectators)\nI understand that dodgeball is a physical sport that involves inherent risks, including but not limited to slips, falls, collisions, and accidental injuries. I acknowledge that both participation and spectating carry potential risks, and I voluntarily assume full responsibility for any injury, accident, or loss that may occur during my time at the event.\n\n2. Release of Liability\nI hereby release and hold harmless The Dodge Club, its organisers, staff, volunteers, sponsors, and venue partners from any and all liability, claims, demands, or causes of action arising out of or related to my participation in or presence at the event, including personal injury, illness, or property damage, whether caused by negligence or otherwise.\n\n3. Personal Responsibility\nI confirm that I am in good physical health (if participating) and able to take part in physical activity. I agree to behave in a safe, respectful, and responsible manner at all times. I understand that reckless, disruptive, or unsafe behaviour may result in removal from the event without a refund.\n\n4. Lost, Stolen or Damaged Items\nI understand that The Dodge Club is not responsible for any lost, stolen, or damaged personal items. I am responsible for keeping my belongings safe and secure.\n\n5. Photography & Media Release\nI give permission for any photos, video footage, or other media captured of me during the event to be used by The Dodge Club for promotional, marketing, and social media purposes. If I have any concerns, I will notify the organisers in writing before the event.\n\n6. Agreement & Signature\nI confirm that I have read, understood, and agree to this waiver and release of liability. By signing below (or agreeing electronically), I voluntarily accept the terms and acknowledge that this applies to me whether I am participating in the game or attending as a spectator.	f	\N	1000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
45	May Showdown	Dodgeball	2026-03-31 17:00:00	london	\N	/api/storage/objects/uploads/ee1a2dfd-ab6a-445c-85e0-fc520b018039	1	2026-03-29 04:10:07.575543	t	\N	\N	\N	\N	[{"id": "custom_1774441599580", "type": "text", "label": "Name", "required": true}, {"id": "custom_1774441613588", "type": "text", "label": "Surname", "required": true}, {"id": "custom_1774441622276", "type": "email", "label": "Email", "required": true}, {"id": "custom_1774824343354", "type": "yes_no", "label": "Have to you attended TDC before?", "required": true}]	THE DODGE CLUB – WAIVER AND RELEASE OF LIABILITY\nPLEASE READ CAREFULLY BEFORE SIGNING\n\nBy attending or participating in The Dodge Club dodgeball event, I acknowledge and agree to the following terms:\n\n1. Assumption of Risk (Players & Spectators)\nI understand that dodgeball is a physical sport that involves inherent risks, including but not limited to slips, falls, collisions, and accidental injuries. I acknowledge that both participation and spectating carry potential risks, and I voluntarily assume full responsibility for any injury, accident, or loss that may occur during my time at the event.\n\n2. Release of Liability\nI hereby release and hold harmless The Dodge Club, its organisers, staff, volunteers, sponsors, and venue partners from any and all liability, claims, demands, or causes of action arising out of or related to my participation in or presence at the event, including personal injury, illness, or property damage, whether caused by negligence or otherwise.\n\n3. Personal Responsibility\nI confirm that I am in good physical health (if participating) and able to take part in physical activity. I agree to behave in a safe, respectful, and responsible manner at all times. I understand that reckless, disruptive, or unsafe behaviour may result in removal from the event without a refund.\n\n4. Lost, Stolen or Damaged Items\nI understand that The Dodge Club is not responsible for any lost, stolen, or damaged personal items. I am responsible for keeping my belongings safe and secure.\n\n5. Photography & Media Release\nI give permission for any photos, video footage, or other media captured of me during the event to be used by The Dodge Club for promotional, marketing, and social media purposes. If I have any concerns, I will notify the organisers in writing before the event.\n\n6. Agreement & Signature\nI confirm that I have read, understood, and agree to this waiver and release of liability. By signing below (or agreeing electronically), I voluntarily accept the terms and acknowledge that this applies to me whether I am participating in the game or attending as a spectator.	f	\N	10000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
43	April Showdown Part 1	The ultimate dodgeball tournament in the UK.	2026-03-28 20:30:00	4 Farmer Rd, E10 5DN, George Mitchell School	\N	/api/storage/objects/uploads/ee1a2dfd-ab6a-445c-85e0-fc520b018039	2	2026-03-27 04:31:50.458634	t	\N	\N	\N	\N	[{"id": "custom_1774441599580", "type": "text", "label": "Name", "required": true}, {"id": "custom_1774441613588", "type": "text", "label": "Surname", "required": true}, {"id": "custom_1774441622276", "type": "email", "label": "Email", "required": true}, {"id": "custom_1774648620778", "type": "yes_no", "label": "Have to you attended TDC before?", "required": true}]	THE DODGE CLUB – WAIVER AND RELEASE OF LIABILITY\n\nPLEASE READ CAREFULLY BEFORE AGREEING\n\nBy attending or participating in any event operated by The Dodge Club Ltd (“The Dodge Club”), I acknowledge and agree to the following:\n\n1. Assumption of Risk (Players & Spectators)\nI understand that dodgeball and event environments involve inherent risks, including but not limited to:\n\nSlips, trips, and falls\nCollisions with other participants or objects\nBeing struck by dodgeballs\nGeneral physical exertion and related injuries\n\nI acknowledge that both participation and spectating carry risks and I voluntarily assume full responsibility for any injury, accident, illness, or loss that may occur during my attendance.\n\n2. Release of Liability\nTo the fullest extent permitted by law, I agree to:\nRelease, waive, and discharge The Dodge Club Ltd, its organisers, staff, volunteers, sponsors, and venue partners from any liability, claims, demands, or causes of action\nThis includes claims arising from personal injury, illness, property damage, or loss, whether caused by negligence or otherwise\nThis does not exclude liability that cannot be excluded under UK law, including liability for death or personal injury caused by negligence.\n\n3. Personal Responsibility & Conduct\nI confirm that:\nI am physically able to participate (if taking part in games)\nI will act responsibly and follow all rules, instructions, and safety guidance\nI will not engage in reckless, unsafe, or disruptive behaviour\nI understand that failure to comply may result in removal from the event without refund.\n\n4. Medical & Emergency Consent\nI consent to receive basic first aid treatment if required.\nIn the event of an emergency, I authorise event staff to seek appropriate medical assistance on my behalf.\n\n5. Personal Belongings\nI understand that The Dodge Club is not responsible for:\n\nLost, stolen, or damaged personal belongings\n\nI am responsible for my own property at all times.\n\n6. Photography & Media Release\nI acknowledge that photos, videos, and other media may be captured during events.\n\nBy attending, I:\nGrant The Dodge Club Ltd permission to use this content for marketing, promotional, and social media purposes\nUnderstand that I can raise concerns in writing prior to the event\n\n7. Agreement\nI confirm that:\n\nI have read and understood this waiver\nI voluntarily agree to its terms\nThis applies whether I am a participant or spectator\n\nBy signing or agreeing electronically, I accept this waiver in full.	f	\N	80	TDC2026	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: merch; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.merch (id, name, description, price, image_url, buy_url, category, in_stock, created_at) FROM stdin;
1	DGE Club Sweat	The go-to tee. Heavyweight 100% cotton with embroidered logo. Available in black and white.	29.99	https://image2url.com/r2/default/images/1774414534003-7ef8f81d-0541-45d9-b673-f919e0fe4109.png	\N	apparel	t	2026-03-25 00:03:13.141599
35	Teir 2 Green	Green	0.00	/api/storage/objects/uploads/2554a8d7-cd0b-466b-af1c-d00829de0d83	\N	apparel	t	2026-03-25 07:19:02.154256
36	FTC Hat	Hat	0.00	/api/storage/objects/uploads/6df3679e-99c7-4a34-8e56-9a4bc02132f7	\N	apparel	t	2026-03-25 07:19:24.637443
34	Teir 2	The latest edition	35.00	/api/storage/objects/uploads/43eb099a-8e7b-4da3-9b47-37be0b0d2202	\N	apparel	t	2026-03-25 07:02:50.037588
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, sender_id, receiver_id, content, created_at, read_at) FROM stdin;
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, email, code, expires_at, used_at, created_at) FROM stdin;
1	info@thedodgeclub.co.uk	293817	2026-03-30 07:30:10.751	2026-03-30 07:21:08.24	2026-03-30 07:20:10.7525
\.


--
-- Data for Name: post_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_comments (id, post_id, user_id, content, created_at) FROM stdin;
3	2	107	Yo this is great!	2026-03-31 16:07:02.649561
\.


--
-- Data for Name: post_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.post_reports (id, post_id, reported_by_user_id, reason, resolved, created_at) FROM stdin;
1	1	107	\N	f	2026-03-31 16:06:06.339272
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.posts (id, title, content, image_url, is_members_only, author_id, created_at, is_elite_only) FROM stdin;
1	Welcome to The Dodge Club App!	We're incredibly excited to launch the official Dodge Club app. This is your home for all things dodgeball — events, merch, community updates, and more. Make sure you create your free account to access the Member Zone.	/api/storage/objects/uploads/50a2273c-65ab-4451-8861-c767b62d5057	f	1	2026-03-25 00:03:13.136976	f
2	New Merch Drop soon come!!	The biggest event in the Dodge Club calendar is back! Summer Slam 2025 tickets are on sale now. Early bird pricing ends 1st July — grab yours before they're gone. We're expecting over 200 players this year.	/api/storage/objects/uploads/792ac2d7-1c96-4efb-9a36-20c3079e63b3	f	1	2026-03-25 00:03:13.136976	f
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.settings (key, value, updated_at) FROM stdin;
emailFromAddress	info@thedodgeclub.co.uk	2026-03-29 03:03:32.538354
communityGuidelines	The Dodge Club – Community Guidelines\nLast updated: 01.04.2026\n\nThese Community Guidelines apply to all members of The Dodge Club Ltd community, including use of:\n\nThe Dodge Club mobile app\nEvents and tournaments\nCommunity groups (e.g. WhatsApp, message boards)\nAny Dodge Club platforms or spaces\n\nBy participating in The Dodge Club, you agree to follow these guidelines.\n\n1. The Vibe Comes First\nThe Dodge Club is built on fun, respect, and community.\n\nBe welcoming—especially to new players\nCompete hard, but keep it friendly\nBring energy, not ego\n\nIf it wouldn’t feel right at an event, it doesn’t belong anywhere in the community.\n\n2. Respect Everyone\nWe are an inclusive community.\n\nNo harassment, bullying, or intimidation\nNo discrimination (race, gender, religion, sexuality, etc.)\nNo aggressive or abusive behaviour\n\nDebate is fine. Disrespect isn’t.\n\n3. Behaviour at Events\nYour behaviour at events matters just as much as online.\n\nRespect players, referees, staff, and spectators\nFollow all rules and instructions\nNo dangerous or unsportsmanlike conduct\n\nWe reserve the right to remove participants from events if needed.\n\n4. App & Platform Use\nWhen using The Dodge Club app or platforms:\n\nNo fake accounts or impersonation\nNo spam or unsolicited promotions\nNo harassment via messages, comments, or posts\n\nUse the platform as it’s intended—to build community.\n\n5. Content Sharing\nWe encourage content—but keep it aligned with the brand.\n\nOnly share content you own or have permission to use\nNo offensive, explicit, or harmful content\nDo not misrepresent events or other members\n\nBy sharing content, you allow The Dodge Club to reshare it for promotional purposes.\n\n6. Privacy & Respect for Others\nDo not share personal information about others without consent\nDo not screenshot or distribute private conversations\nRespect people’s boundaries both online and offline\n\n7. Fair Play (On & Off the Court)\nPlay honestly and respect the game\nDo not manipulate systems (tickets, stats, teams, etc.)\nRespect decisions made by referees and staff\n8. Reporting & Community Responsibility\n\nWe all play a role in protecting the community.\n\nIf you see behaviour that violates these guidelines, report it using the in-app report feature or contact the team directly\nDo not escalate or engage in arguments\nAll reports are reviewed and handled by The Dodge Club team\n\nSpeaking up helps keep the community safe and enjoyable for everyone\n\n9. Enforcement\nTo protect the community, we may take action where guidelines are not followed.\n\nThis may include:\n\nWarnings\nRemoval from chats or features\nSuspension from the app\nRemoval from events\nPermanent bans from The Dodge Club\n10. One Community, One Standard\n\nYour behaviour across all Dodge Club spaces is connected.\nApp, events, and community platforms are treated as one ecosystem\n\nIf you violate guidelines in one area, action may apply across all.\n\nSimple Rule to Remember\nDon’t ruin the vibe.	2026-03-29 03:03:32.541556
emailBodyHtml	\N	2026-03-29 03:03:32.543577
emailCtaUrl	https://thedodgeclub.co.uk	2026-03-29 03:03:32.546025
emailCtaText	Visit our website	2026-03-29 03:03:32.547893
emailBodyText	Hey {{userName}}, You're in! \n\nYou've secured your ticket for {{eventName}} on {{eventDate}}.\n\nYour ticket details are below — just show the QR code at the door. See you on the court!	2026-03-29 03:03:32.550508
privacyPolicyContent	Privacy Policy – The Dodge Club\nLast updated: 01.04.2026\n\nThis Privacy Policy explains how The Dodge Club Ltd (“we”, “us”, “our”) collects, uses, and protects your personal data when you interact with The Dodge Club, including:\n\nOur mobile application (the “App”)\nOur website(s)\nEvent registrations and ticket purchases\nCommunity platforms (including messaging groups and content sharing)\n\nLast updated: [Insert Date]\n\n1. Information We Collect\nWe may collect and process the following categories of personal data:\n\na. Identity & Contact Information\nName\nEmail address\nPhone number (if provided)\nAccount/profile details\n\nb. Account & App Data\nLogin details and profile information\nAttendance history\nParticipation data (e.g. matches, medals, stats)\nIn-app activity and interactions\n\nc. Transaction Data\nTicket purchases and booking details\nPayment confirmations and transaction history\n\nPayments are processed securely by third-party providers (e.g. Stripe). We do not store full payment card details.\n\nd. Content & Community Data\nPhotos, videos, and posts you upload\nMessages, comments, and interactions\nFeedback, testimonials, or survey responses\n\ne. Technical & Usage Data\nIP address\nDevice type, browser, and operating system\nApp and website usage data\nAnalytics and performance data\n\nf. Event Data\nEvent attendance and participation\nMedia captured at events (photos and videos)\n\n2. How We Use Your Information\nWe use your personal data to:\n\nProvide and manage access to our App, website, and services\nProcess ticket purchases and event registrations\nTrack participation, stats, and achievements\nFacilitate community features (messaging, content sharing)\nImprove our services, events, and user experience\nCommunicate with you about events, updates, and offers\nEnsure safety, security, and fair use of our platform\n\n3. Legal Basis for Processing (UK GDPR)\nWe rely on the following legal bases:\n\nContract: To provide services you’ve signed up for (e.g. tickets, app access)\nLegitimate Interests: To operate and improve The Dodge Club and its community\nConsent: For marketing communications and certain data uses\nLegal Obligation: Where required by law\n\n4. Sharing Your Information\nWe may share your personal data with:\n\nPayment providers (e.g. Stripe)\nTechnology and hosting providers\nAnalytics and marketing service providers\nEvent partners or venues (where necessary)\nLegal or regulatory authorities when required\n\nWe do not sell your personal data.\n\n5. Content & Media\nContent you share (e.g. posts, photos, videos) may be visible to other users\nMedia captured at events may be used for marketing and promotional purposes\nBy participating in events or posting content, you grant us permission to use this content for promotional use\n\n6. Data Retention\nWe retain personal data only as long as necessary to:\n\nProvide our services\nMaintain records for legal and operational purposes\nResolve disputes and enforce agreements\n\nYou may request deletion of your data at any time.\n\n7. Your Rights\nUnder UK GDPR, you have the right to:\n\nAccess your personal data\nCorrect inaccurate information\nRequest deletion of your data\nRestrict or object to processing\nRequest a copy of your data (data portability)\n\nTo exercise your rights, contact:\ninfo@thedodgeclub.co.uk\n\n8. Data Security\nWe implement appropriate technical and organisational measures, including:\n\nSecure servers and encryption\nAccess controls and data protection procedures\nTrusted third-party providers\n\n9. Third-Party Services\nWe use third-party providers (e.g. Stripe, analytics tools) to support our services.\nThese providers have their own privacy policies.\n\n10. Children’s Privacy\nOur services are not intended for children under 13, and we do not knowingly collect data from children.\n\n11. Changes to This Policy\nWe may update this Privacy Policy from time to time.\nWe will notify users of any significant changes.\n\n12. Contact Us\nIf you have any questions about this Privacy Policy, contact:\ninfo@thedodgeclub.co.uk\nThe Dodge Club LTD, 86-90 Paul Street,London,EC2A 4NE	2026-03-29 03:03:32.552377
emailLogoUrl	/api/storage/objects/uploads/43f7a85f-1830-45e2-a4aa-63d97f193a02	2026-03-29 03:03:32.554296
homeHeroBannerTitle	A New Season Begins	2026-03-29 03:03:32.555987
emailHeaderImageUrl		2026-03-29 03:03:32.558185
homeFeaturedVideoEnabled	true	2026-03-29 03:03:32.559901
homeVideoUrl	https://streamable.com/l/7c5mxb/mp4.mp4	2026-03-29 03:03:32.561404
emailFromName	The Dodge Club	2026-03-29 03:03:32.562946
emailSubject	Your ticket is confirmed! 🎉	2026-03-29 03:03:32.565053
homeHeroBannerSubtitle	Sat 11th & 18th April	2026-03-29 03:03:32.566627
homeFeaturedVideoId	2	2026-03-29 03:03:32.568293
homeHeroImageUrl	/api/storage/objects/uploads/8dbbe339-4b21-4fb7-8f8b-a17b2003bf1a	2026-03-29 03:03:32.570165
homeHeroBannerLinkUrl	\N	2026-03-29 03:03:32.656766
homeHeroImagePosition	47 47	2026-03-29 03:03:32.658962
termsOfService	Terms of Service – The Dodge Club\n\nLast updated: 01.04.2026\n\nThese Terms of Service (“Terms”) govern your use of services provided by The Dodge Club Ltd (“we”, “us”, “our”), including:\n\nThe Dodge Club mobile application (the “App”)\nOur website(s)\nEvent registrations and ticket purchases\nCommunity platforms and interactions\n\nBy accessing or using any of our services, you agree to these Terms.\n\n1. Eligibility\nYou must be at least 18 years old to participate in events or create an account\nBy using our services, you confirm that all information provided is accurate\n\n2. Accounts\nYou are responsible for maintaining the security of your account\nYou must not create false accounts or impersonate others\nWe reserve the right to suspend or terminate accounts at our discretion\n\n3. Tickets & Bookings\na. Purchases\nTickets must be purchased through official channels only\nAll bookings are subject to availability\n\nb. Refunds & Transfers\nTickets are non-refundable unless explicitly stated otherwise\nApproved resale or transfer options may be provided through official channels\n\nc. Event Changes\nWe reserve the right to:\n\nChange event dates, times, venues, or formats\nCancel events where necessary\n\nIn such cases, we will communicate appropriate next steps.\n\n4. Participation & Conduct\nBy attending events or engaging with The Dodge Club, you agree to:\n\nFollow all rules, instructions, and safety guidance\nTreat all participants, staff, and spectators with respect\nAvoid aggressive, unsafe, or disruptive behaviour\n\nWe reserve the right to remove individuals from events without refund where necessary.\n\n5. Health & Safety\nBy participating in events, you confirm that:\n\nYou are physically able to take part in dodgeball activities\nYou understand and accept the risks associated with physical activity\nYou will follow all safety instructions provided\nParticipation is at your own risk.\n\n6. App, Website & Platform Use\nYou agree not to:\nUse our platforms for unlawful purposes\nAttempt to hack, disrupt, or exploit any system\nUse bots, scripts, or automated tools\nInterfere with other users’ experience\nWe may restrict or terminate access for misuse.\n\n7. Community Guidelines\nYour use of our services is also subject to our Community Guidelines.\nFailure to follow these may result in account or event restrictions.\n\n8. User Content\na. Ownership\nYou retain ownership of content you upload.\n\nb. Licence\nBy posting content, you grant The Dodge Club Ltd a non-exclusive, worldwide, royalty-free licence to use, reproduce, and share your content for promotional and marketing purposes.\n\nc. Responsibility\nYou are responsible for ensuring your content:\n\nDoes not infringe on rights of others\nIs not harmful, offensive, or misleading\n\n9. Stats, Features & Membership\nStats, rankings, and features are provided for engagement purposes\nWe reserve the right to modify, reset, or remove features at any time\nMembership features (if applicable) may be updated or discontinued\n\n10. Payments & Third Parties\nPayments are processed via third-party providers (e.g. Stripe)\nWe are not responsible for third-party services or their policies\n\n11. Suspension & Termination\nWe may suspend or terminate access to our services if you:\n\nBreach these Terms\nViolate Community Guidelines\nEngage in harmful or unsafe behaviour\nThis may include removal from events and the App without refund.\n\n12. Limitation of Liability\nTo the fullest extent permitted by law:\n\nParticipation in Dodge Club activities is at your own risk\nWe are not liable for injury, loss, or damage arising from participation\nWe are not responsible for technical issues, interruptions, or data loss\nNothing in these Terms excludes liability that cannot be excluded under UK law.\n\n13. Privacy\nYour use of our services is also governed by our Privacy Policy.\n\n14. Changes to These Terms\nWe may update these Terms from time to time.\nContinued use of our services means you accept any updates.\n\n15. Governing Law\nThese Terms are governed by the laws of England and Wales.\n\n15. Contact\nFor any questions, contact: info@thedodgeclub.co.uk\nThe Dodge Club LTD, 86-90 Paul Street,London,EC2A 4NE	2026-03-29 03:03:32.660678
\.


--
-- Data for Name: streak_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.streak_notifications (id, event_id, user_id, sent_at) FROM stdin;
\.


--
-- Data for Name: team_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.team_history (id, user_id, team_name, season, role_in_team, notes, created_at) FROM stdin;
\.


--
-- Data for Name: ticket_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ticket_types (id, event_id, name, description, price, quantity, quantity_sold, sale_starts_at, sale_ends_at, is_active, sort_order, stripe_product_id, stripe_price_id, created_at, max_per_order) FROM stdin;
6	43	Supporter Ticket	Come and enjoy the games	1100	25	0	\N	\N	t	2	\N	\N	2026-03-27 04:31:50.462175	2
5	43	Standard Player Ticket	Non refundable ticket	2500	70	0	\N	\N	t	1	\N	\N	2026-03-27 04:31:50.462175	2
7	44	Supporter Ticket	Come and enjoy the games	1100	25	0	\N	\N	t	2	\N	\N	2026-03-27 16:12:36.578406	\N
8	44	Standard Player Ticket	Non refundable ticket	2500	70	0	\N	\N	t	1	\N	\N	2026-03-27 16:12:36.578406	\N
4	43	Early Player Ticket	Non refundable Player Ticket	0	30	13	2026-03-27 12:29:00	\N	t	0	\N	\N	2026-03-27 04:31:50.462175	2
10	45	Supporter Ticket	Come and enjoy the games	1100	25	0	\N	\N	t	2	\N	\N	2026-03-29 04:10:07.580198	\N
11	45	Standard Player Ticket	Non refundable ticket	2500	70	0	\N	\N	t	1	\N	\N	2026-03-29 04:10:07.580198	\N
12	45	Early Player Ticket	Non refundable 	0	30	5	2026-03-27 12:29:00	\N	t	0	\N	\N	2026-03-29 04:10:07.580198	\N
9	44	Early Player Ticket	Non refundable 	0	30	1	2026-03-27 12:29:00	\N	t	0	\N	\N	2026-03-27 16:12:36.578406	\N
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tickets (id, user_id, event_id, stripe_payment_intent_id, stripe_checkout_session_id, status, ticket_code, checked_in, checked_in_at, amount_paid, created_at, checkout_data, gift_recipient_email, ticket_type_id, discount_code_id, original_amount_paid) FROM stdin;
29	85	43	\N	cs_live_a1BRgOBbnco24Sf4JF763ApE3rwxSsFZPpnlwkDQ8SeFzVPop37MspmScc	pending	EA4ADB6FB38221D6	f	\N	0	2026-03-27 14:40:04.799024	{"__waiver_signed": "true", "custom_1774441599580": "Quason", "custom_1774441613588": "Matthews", "custom_1774441622276": "Quasonmatthews@gmail.com", "custom_1774620697978": "Yes"}	\N	5	\N	\N
27	85	43	\N	\N	cancelled	8772F42D13357293	f	\N	0	2026-03-27 13:50:30.911793	{"custom_1774441599580": "Q", "custom_1774441613588": "Ma", "custom_1774441622276": "Quasonmatthews@gmail.com"}	\N	4	\N	\N
26	85	43	\N	\N	cancelled	175416841019F81E	f	\N	0	2026-03-27 13:50:30.911793	{"custom_1774441599580": "Q", "custom_1774441613588": "Ma", "custom_1774441622276": "Quasonmatthews@gmail.com"}	\N	4	\N	\N
30	85	43	\N	\N	paid	BFBD621B61CF2EB8	f	\N	0	2026-03-27 14:49:05.611107	{"__waiver_signed": "true", "custom_1774441599580": "James", "custom_1774441613588": "James", "custom_1774441622276": "Info@thedodgeclub.co.uk", "custom_1774620697978": "Yes"}	\N	4	\N	\N
31	85	43	\N	\N	paid	95A6605E9DC17545	f	\N	0	2026-03-27 14:50:13.342019	\N	info@thedodgeclub.co.uk	4	\N	\N
32	1	43	\N	\N	paid	3B23A4233FCA69DC	t	2026-03-27 19:19:00.707	0	2026-03-27 19:15:51.137975	{"__waiver_signed": "true", "custom_1774441599580": "f", "custom_1774441613588": "f", "custom_1774441622276": "quasonmatthews@gmail.com", "custom_1774620697978": "no"}	\N	4	\N	\N
22	83	43	\N	\N	cancelled	43663864C4A902D6	t	2026-03-27 19:24:58.732	0	2026-03-27 12:30:48.20681	{"custom_1774441599580": "Q", "custom_1774441613588": "Q", "custom_1774441622276": "quasonmatthews@gmail.com"}	\N	4	\N	\N
23	83	43	\N	\N	cancelled	619F910BD9052DEA	t	2026-03-27 19:24:58.732	0	2026-03-27 13:11:47.522469	{"custom_1774441599580": "Q", "custom_1774441613588": "Q", "custom_1774441622276": "Quasonmatthews@gmail.com"}	\N	4	\N	\N
24	83	43	\N	\N	cancelled	C65152CE8569DBA4	t	2026-03-27 19:24:58.732	0	2026-03-27 13:45:59.037178	{"custom_1774441599580": "Am", "custom_1774441613588": "Hg", "custom_1774441622276": "Quasonmatthews@gmail.com"}	\N	4	\N	\N
25	83	43	\N	\N	cancelled	5A27FC3E416B760C	t	2026-03-27 19:24:58.732	0	2026-03-27 13:45:59.037178	{"custom_1774441599580": "Am", "custom_1774441613588": "Hg", "custom_1774441622276": "Quasonmatthews@gmail.com"}	\N	4	\N	\N
28	83	43	\N	\N	cancelled	60480DD61FC23D69	t	2026-03-27 19:24:58.732	0	2026-03-27 13:56:18.481045	\N	\N	\N	\N	\N
33	83	43	\N	\N	paid	B90E7CEC539660CF	t	2026-03-27 19:24:58.732	0	2026-03-27 19:20:05.264548	{"__waiver_signed": "true", "custom_1774441599580": "Quason", "custom_1774441613588": "Matthes", "custom_1774441622276": "quasonmatthews@gmail.com", "custom_1774620697978": "No"}	\N	4	\N	\N
34	85	43	\N	\N	paid	6DDC0B8997ADE8BE	f	\N	0	2026-03-27 22:03:19.187546	{"__waiver_signed": "true", "custom_1774441599580": "Q", "custom_1774441613588": "M", "custom_1774441622276": "Quasonmatthews@gmail.com", "custom_1774648620778": "Yes"}	\N	4	\N	\N
35	83	43	\N	\N	paid	691BA74A93B0E9F0	f	\N	0	2026-03-28 07:48:56.415397	{"__waiver_signed": "true", "custom_1774441599580": "Quason", "custom_1774441613588": "Quason", "custom_1774441622276": "quasonmatthews@gmail.com", "custom_1774648620778": "Yes"}	\N	4	\N	\N
36	83	43	\N	\N	paid	64A296561E76D357	f	\N	0	2026-03-28 07:48:56.415397	{"__waiver_signed": "true", "custom_1774441599580": "Quason", "custom_1774441613588": "Quason", "custom_1774441622276": "quasonmatthews@gmail.com", "custom_1774648620778": "Yes"}	\N	4	\N	\N
57	83	45	pi_3TH3ldRqEaJwGxMg11ZUFnkX	\N	pending	405315709F71CFBE	f	\N	0	2026-03-31 14:59:45.732383	{"__waiver_signed": "true", "custom_1774441599580": "Quason", "custom_1774441613588": "Quason", "custom_1774441622276": "quasonmatthews@gmail.com", "custom_1774824343354": "No"}	\N	10	\N	\N
38	83	43	\N	cs_live_a19oIPhNFY8HAhyesNeq9WfdkkaOZ90GneSkQRZIHpmYX8O0g7KaxE8XpK	pending	763978ECC61A8C7C	f	\N	0	2026-03-28 08:09:18.453169	{"__waiver_signed": "true", "custom_1774441599580": "Quason", "custom_1774441613588": "Quason", "custom_1774441622276": "quasonmatthews@gmail.com", "custom_1774648620778": "No"}	\N	5	\N	\N
39	87	43	\N	\N	paid	679D39F9609E3FB2	f	\N	0	2026-03-28 19:05:49.358465	{"__waiver_signed": "true", "custom_1774441599580": "Jay", "custom_1774441613588": "Jay", "custom_1774441622276": "jay@gmail.com", "custom_1774648620778": "Yes"}	\N	4	\N	\N
40	83	45	\N	\N	paid	08792A87EF435A9D	f	\N	0	2026-03-29 23:03:43.626396	{"__waiver_signed": "true", "custom_1774441599580": "Quason", "custom_1774441613588": "Quason", "custom_1774441622276": "quasonmatthews@gmail.com", "custom_1774824343354": "Yes"}	\N	12	\N	\N
50	105	44	pi_3TGa9rRqEaJwGxMg0Cz5s866	\N	pending	48483CB648B5FEA7	f	\N	0	2026-03-30 07:22:46.914534	{"__waiver_signed": "true", "custom_1774441599580": "Jake", "custom_1774441613588": "Jake", "custom_1774441622276": "info@thedodgeclub.co.uk", "custom_1774824330088": "No"}	\N	8	\N	\N
51	105	45	pi_3TGaBORqEaJwGxMg0NLW4b2h	\N	pending	6DC70E21CB296F94	f	\N	0	2026-03-30 07:24:21.9902	{"__waiver_signed": "true", "custom_1774441599580": "Jake", "custom_1774441613588": "Jake", "custom_1774441622276": "info@thedodgeclub.co.uk", "custom_1774824343354": "Yes"}	\N	11	\N	\N
61	83	44	pi_3TH4weRqEaJwGxMg0Cp9gbMA	\N	pending	5DD9D7B1E2E7FEB2	f	\N	0	2026-03-31 16:15:12.225542	{"__waiver_signed": "true", "custom_1774441599580": "Quason", "custom_1774441613588": "Quason", "custom_1774441622276": "quasonmatthews@gmail.com", "custom_1774824330088": "No"}	\N	7	\N	\N
58	107	45	\N	\N	paid	15180C66AA6CFFB1	t	2026-03-31 16:54:46.967	0	2026-03-31 16:08:20.240859	{"__waiver_signed": "true", "custom_1774441599580": "Bob", "custom_1774441613588": "Cat", "custom_1774441622276": "contact@agiletechsolutions.co.uk", "custom_1774824343354": "Yes"}	\N	12	\N	\N
59	107	45	\N	\N	paid	EACD6BA9674FE15D	t	2026-03-31 16:54:46.967	0	2026-03-31 16:08:20.240859	{"__waiver_signed": "true", "custom_1774441599580": "Bob", "custom_1774441613588": "Cat", "custom_1774441622276": "contact@agiletechsolutions.co.uk", "custom_1774824343354": "Yes"}	\N	12	\N	\N
60	107	45	pi_3TH4w9RqEaJwGxMg1lUdsI02	\N	pending	421864C7E8630BA4	t	2026-03-31 16:54:46.967	0	2026-03-31 16:14:41.652024	{"__waiver_signed": "true", "custom_1774441599580": "Bob", "custom_1774441613588": "Cat", "custom_1774441622276": "contact@agiletechsolutions.co.uk", "custom_1774824343354": "Yes"}	\N	10	\N	\N
62	83	44	\N	\N	paid	23CC7936473C5921	f	\N	0	2026-04-01 15:01:57.693582	{"__waiver_signed": "true", "custom_1774441599580": "Quason", "custom_1774441613588": "Quason", "custom_1774441622276": "quasonmatthews@gmail.com", "custom_1774824330088": "No"}	\N	9	\N	\N
\.


--
-- Data for Name: user_blocks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_blocks (id, blocker_id, blocked_id, created_at) FROM stdin;
\.


--
-- Data for Name: user_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_reports (id, reported_user_id, reported_by_user_id, reason, resolved, resolved_at, created_at) FROM stdin;
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_sessions (id, user_id, duration, started_at, ended_at) FROM stdin;
64	1	150	2026-03-25 15:43:35.695	2026-03-25 15:46:05.382
65	1	150	2026-03-25 15:43:35.695	2026-03-25 15:46:05.389
112	83	300	2026-03-25 21:24:46.107	2026-03-25 21:29:46.813
113	83	86	2026-03-25 21:31:15.51	2026-03-25 21:32:42.081
114	83	86	2026-03-25 21:31:15.51	2026-03-25 21:32:42.086
115	83	41	2026-03-25 21:32:26.412	2026-03-25 21:34:39.937
116	83	41	2026-03-25 21:32:26.412	2026-03-25 21:34:39.94
117	83	300	2026-03-25 21:29:49.441	2026-03-25 21:34:49.517
118	83	34	2026-03-25 21:35:20.046	2026-03-25 21:37:32.295
119	83	34	2026-03-25 21:35:20.046	2026-03-25 21:37:32.296
120	83	146	2026-03-25 21:35:43.931	2026-03-25 21:38:10.485
121	83	201	2026-03-25 21:34:49.459	2026-03-25 21:38:11.136
122	83	167	2026-03-25 21:35:24.221	2026-03-25 21:38:11.828
123	83	205	2026-03-25 21:38:21.387	2026-03-25 21:41:46.902
124	83	205	2026-03-25 21:38:22.287	2026-03-25 21:41:47.306
125	83	69	2026-03-25 21:40:38.217	2026-03-25 21:41:47.69
126	83	148	2026-03-25 21:41:53.056	2026-03-25 21:44:21.593
127	83	148	2026-03-25 21:41:53.056	2026-03-25 21:44:21.594
128	83	142	2026-03-25 21:44:31.363	2026-03-25 21:46:53.58
129	83	15	2026-03-25 21:47:17.91	2026-03-25 21:47:33.65
130	83	33	2026-03-25 21:47:12.699	2026-03-25 21:47:51.574
131	83	33	2026-03-25 21:47:12.699	2026-03-25 21:47:51.575
132	83	300	2026-03-25 21:47:32.983	2026-03-25 21:52:33.637
133	83	1483	2026-03-25 21:52:32.984	2026-03-25 22:17:18.886
134	83	5	2026-03-25 22:17:16.084	2026-03-25 22:17:21.937
135	83	300	2026-03-25 22:32:44.061	2026-03-25 22:37:44.238
136	83	300	2026-03-25 22:37:44.064	2026-03-25 22:42:44.238
137	83	300	2026-03-25 22:40:06.028	2026-03-25 22:45:06.848
138	83	146	2026-03-25 22:45:06.033	2026-03-25 22:47:32.973
139	83	300	2026-03-25 22:42:44.066	2026-03-25 22:47:44.531
140	83	44	2026-03-25 22:47:44.067	2026-03-25 22:48:27.904
141	83	44	2026-03-25 22:47:44.067	2026-03-25 22:48:27.998
142	83	131	2026-03-25 22:47:54.937	2026-03-25 22:50:07.934
143	83	135	2026-03-25 22:49:53.121	2026-03-25 22:52:08.271
144	83	135	2026-03-25 22:49:53.121	2026-03-25 22:52:08.277
145	83	8	2026-03-25 22:52:36.009	2026-03-25 22:52:44.238
146	83	244	2026-03-25 22:50:06.031	2026-03-25 22:54:10.051
147	83	300	2026-03-25 22:54:22.55	2026-03-25 22:59:23.18
148	83	69	2026-03-25 22:59:45.465	2026-03-25 23:00:54.713
149	83	69	2026-03-25 22:59:45.465	2026-03-25 23:00:54.723
150	83	300	2026-03-25 22:59:22.557	2026-03-25 23:04:23.286
151	83	44	2026-03-25 23:09:45.618	2026-03-25 23:10:29.759
152	83	300	2026-03-25 23:07:08.384	2026-03-25 23:12:08.767
153	83	300	2026-03-25 23:08:38.307	2026-03-25 23:13:38.89
154	83	300	2026-03-25 23:12:08.386	2026-03-25 23:17:08.891
155	1	70	2026-03-25 23:17:07.619	2026-03-25 23:18:17.404
156	1	70	2026-03-25 23:17:07.619	2026-03-25 23:18:17.397
157	83	300	2026-03-25 23:17:08.387	2026-03-25 23:22:08.785
158	83	300	2026-03-25 23:22:08.397	2026-03-25 23:27:08.476
159	1	144	2026-03-25 23:28:05.18	2026-03-25 23:30:29.051
160	1	144	2026-03-25 23:28:05.18	2026-03-25 23:30:29.057
161	83	7	2026-03-25 23:30:57.988	2026-03-25 23:31:05.473
162	83	300	2026-03-25 23:27:08.398	2026-03-25 23:32:08.795
163	83	300	2026-03-25 23:31:44.699	2026-03-25 23:36:44.822
164	83	300	2026-03-25 23:32:08.399	2026-03-25 23:37:08.788
165	83	300	2026-03-25 23:37:08.4	2026-03-25 23:42:08.821
166	83	300	2026-03-25 23:39:24.931	2026-03-25 23:44:25.576
167	83	300	2026-03-25 23:42:08.41	2026-03-25 23:47:08.827
168	83	300	2026-03-25 23:44:24.943	2026-03-25 23:49:25.581
169	83	300	2026-03-25 23:49:24.942	2026-03-25 23:54:26.311
170	83	300	2026-03-25 23:54:24.953	2026-03-25 23:59:25.637
171	1	41	2026-03-25 23:59:43.253	2026-03-26 00:00:24.287
172	1	41	2026-03-25 23:59:43.253	2026-03-26 00:00:24.292
173	83	300	2026-03-26 00:00:44.183	2026-03-26 00:05:44.853
174	83	128	2026-03-26 00:05:44.187	2026-03-26 00:07:54.085
175	83	1734	2026-03-26 00:05:44.187	2026-03-26 00:34:39.347
179	83	300	2026-03-26 07:47:17.343	2026-03-26 07:52:18.262
185	83	2010	2026-03-26 07:52:17.355	2026-03-26 08:25:49.454
186	83	38	2026-03-26 08:26:07.693	2026-03-26 08:26:45.959
187	83	118	2026-03-26 08:30:45.818	2026-03-26 08:32:44.998
188	83	299	2026-03-26 09:49:45.159	2026-03-26 09:54:45.372
189	83	300	2026-03-26 09:54:33.03	2026-03-26 09:59:33.447
190	83	143	2026-03-26 09:59:33.034	2026-03-26 10:01:56.74
191	83	169	2026-03-26 09:59:07.427	2026-03-26 10:01:57.009
192	83	300	2026-03-26 10:03:10.771	2026-03-26 10:08:11.177
193	83	300	2026-03-26 10:08:10.783	2026-03-26 10:13:11.198
194	83	300	2026-03-26 10:13:10.799	2026-03-26 10:18:11.196
195	83	300	2026-03-26 10:18:10.799	2026-03-26 10:23:11.202
196	83	300	2026-03-26 10:18:41.76	2026-03-26 10:23:43.207
197	83	300	2026-03-26 10:23:10.8	2026-03-26 10:28:11.207
198	83	300	2026-03-26 10:23:41.776	2026-03-26 10:28:42.804
199	83	300	2026-03-26 10:28:10.802	2026-03-26 10:33:11.212
200	83	300	2026-03-26 10:28:41.776	2026-03-26 10:33:42.958
202	83	226	2026-03-26 10:33:41.777	2026-03-26 10:37:29.663
203	83	300	2026-03-26 10:33:10.804	2026-03-26 10:38:11.214
204	83	60	2026-03-26 10:37:41.493	2026-03-26 10:38:42.512
205	83	300	2026-03-26 10:38:10.809	2026-03-26 10:43:11.213
206	83	300	2026-03-26 10:38:41.778	2026-03-26 10:43:42.763
207	83	101	2026-03-26 10:43:10.808	2026-03-26 10:44:52.597
208	83	70	2026-03-26 10:43:41.779	2026-03-26 10:44:53.353
209	83	153	2026-03-26 10:44:52.214	2026-03-26 10:47:25.629
210	83	153	2026-03-26 10:44:52.218	2026-03-26 10:47:25.906
211	83	300	2026-03-26 10:47:25.237	2026-03-26 10:52:25.635
212	83	300	2026-03-26 10:47:25.185	2026-03-26 10:52:26.052
213	83	74	2026-03-26 10:52:25.24	2026-03-26 10:53:39.34
214	83	74	2026-03-26 10:52:25.187	2026-03-26 10:53:39.945
215	83	300	2026-03-26 10:53:38.953	2026-03-26 10:58:39.369
216	83	300	2026-03-26 10:53:38.97	2026-03-26 10:58:40.012
217	83	52	2026-03-26 10:58:38.973	2026-03-26 10:59:31.311
218	83	300	2026-03-26 10:58:38.972	2026-03-26 11:03:39.533
219	83	5	2026-03-26 11:03:34.086	2026-03-26 11:03:39.742
220	83	30	2026-03-26 11:06:28.935	2026-03-26 11:07:00.146
221	83	300	2026-03-26 11:03:38.973	2026-03-26 11:08:39.387
222	83	300	2026-03-26 11:08:38.985	2026-03-26 11:13:39.387
223	83	48	2026-03-26 11:13:46.473	2026-03-26 11:14:35.147
224	83	300	2026-03-26 11:13:38.985	2026-03-26 11:18:39.404
225	83	215	2026-03-26 11:15:10.452	2026-03-26 11:18:46.621
226	83	300	2026-03-26 11:18:38.985	2026-03-26 11:23:39.384
227	83	300	2026-03-26 11:18:45.868	2026-03-26 11:23:46.617
228	83	281	2026-03-26 11:23:38.989	2026-03-26 11:28:19.941
229	83	300	2026-03-26 11:23:45.871	2026-03-26 11:28:46.483
230	83	300	2026-03-26 11:28:19.543	2026-03-26 11:33:19.94
231	83	300	2026-03-26 11:28:45.873	2026-03-26 11:33:46.542
232	83	300	2026-03-26 11:33:19.55	2026-03-26 11:38:19.932
233	83	300	2026-03-26 11:38:19.547	2026-03-26 11:43:19.941
234	83	300	2026-03-26 11:43:19.551	2026-03-26 11:48:19.961
235	83	300	2026-03-26 11:44:26.009	2026-03-26 11:49:26.719
236	83	88	2026-03-26 11:49:26.029	2026-03-26 11:50:54.737
237	83	300	2026-03-26 11:48:19.56	2026-03-26 11:53:19.962
238	83	1525	2026-03-26 11:51:48.118	2026-03-26 12:17:15.056
239	83	300	2026-03-26 12:18:53.045	2026-03-26 12:23:53.424
240	83	300	2026-03-26 12:21:51.341	2026-03-26 12:26:52.505
241	83	181	2026-03-26 12:23:53.057	2026-03-26 12:26:54.079
242	83	300	2026-03-26 12:26:51.346	2026-03-26 12:31:52.878
243	83	300	2026-03-26 12:27:23.696	2026-03-26 12:32:23.758
244	83	300	2026-03-26 12:31:51.345	2026-03-26 12:36:52.634
245	83	300	2026-03-26 12:32:23.702	2026-03-26 12:37:24.071
246	83	300	2026-03-26 12:36:51.346	2026-03-26 12:41:52.274
247	83	300	2026-03-26 12:37:23.703	2026-03-26 12:42:24.09
248	83	300	2026-03-26 12:41:51.346	2026-03-26 12:46:52.283
249	83	300	2026-03-26 12:42:23.706	2026-03-26 12:47:24.094
250	83	108	2026-03-26 12:46:51.348	2026-03-26 12:48:40.744
251	83	277	2026-03-26 12:47:23.708	2026-03-26 12:52:01.375
252	83	300	2026-03-26 12:52:00.999	2026-03-26 12:57:01.403
253	83	300	2026-03-26 12:56:46.563	2026-03-26 13:01:47.74
254	83	300	2026-03-26 12:57:01.016	2026-03-26 13:02:01.071
255	83	300	2026-03-26 13:01:46.564	2026-03-26 13:06:47.867
256	83	300	2026-03-26 13:02:01.016	2026-03-26 13:07:01.399
257	83	300	2026-03-26 13:06:46.568	2026-03-26 13:11:47.605
258	83	300	2026-03-26 13:07:01.018	2026-03-26 13:12:01.438
259	83	300	2026-03-26 13:11:46.582	2026-03-26 13:16:47.556
260	83	300	2026-03-26 13:16:46.583	2026-03-26 13:21:47.372
261	83	300	2026-03-26 13:21:46.584	2026-03-26 13:26:47.461
262	83	300	2026-03-26 13:36:35.45	2026-03-26 13:41:36.912
263	83	300	2026-03-26 13:51:10.008	2026-03-26 13:56:11.319
264	83	155	2026-03-26 13:56:10.011	2026-03-26 13:58:47.192
265	83	300	2026-03-26 14:03:55.673	2026-03-26 14:08:57.18
266	83	192	2026-03-26 14:08:55.679	2026-03-26 14:12:08.934
267	83	300	2026-03-26 14:15:38.626	2026-03-26 14:20:40.123
268	83	61	2026-03-26 14:31:58.406	2026-03-26 14:32:59.716
269	1	27	2026-03-26 14:33:12.963	2026-03-26 14:33:39.988
270	1	27	2026-03-26 14:33:12.963	2026-03-26 14:33:40
271	1	130	2026-03-26 14:35:25.18	2026-03-26 14:37:35.402
272	1	94	2026-03-26 14:37:35.238	2026-03-26 14:39:09.385
273	83	217	2026-03-26 14:35:31.865	2026-03-26 14:39:10.95
274	1	300	2026-03-26 14:39:09.119	2026-03-26 14:44:09.289
275	83	300	2026-03-26 14:39:09.243	2026-03-26 14:44:10.05
276	1	23	2026-03-26 14:44:09.122	2026-03-26 14:44:32.42
277	83	23	2026-03-26 14:44:09.246	2026-03-26 14:44:33.232
278	1	8	2026-03-26 14:44:32.047	2026-03-26 14:44:40.629
279	83	9	2026-03-26 14:44:32.154	2026-03-26 14:44:41.765
280	83	244	2026-03-26 14:44:40.871	2026-03-26 14:48:45.607
281	1	300	2026-03-26 14:44:40.457	2026-03-26 14:49:40.931
282	1	300	2026-03-26 14:49:40.461	2026-03-26 14:54:40.638
283	1	300	2026-03-26 14:54:40.462	2026-03-26 14:59:40.638
285	1	300	2026-03-26 14:59:40.464	2026-03-26 15:04:40.641
286	1	300	2026-03-26 15:04:40.465	2026-03-26 15:09:40.633
287	83	6	2026-03-26 15:09:36.777	2026-03-26 15:09:43.142
288	1	300	2026-03-26 15:09:40.466	2026-03-26 15:14:40.641
289	83	300	2026-03-26 15:09:55.884	2026-03-26 15:14:56.921
290	1	300	2026-03-26 15:14:40.468	2026-03-26 15:19:40.93
291	83	287	2026-03-26 15:14:55.901	2026-03-26 15:19:44.475
292	1	300	2026-03-26 15:19:40.468	2026-03-26 15:24:40.643
293	1	300	2026-03-26 15:24:40.469	2026-03-26 15:29:40.637
294	1	300	2026-03-26 15:29:40.471	2026-03-26 15:34:40.645
295	1	300	2026-03-26 15:34:40.472	2026-03-26 15:39:40.633
296	1	300	2026-03-26 15:39:40.474	2026-03-26 15:44:40.639
297	1	300	2026-03-26 15:44:40.476	2026-03-26 15:49:40.923
298	1	300	2026-03-26 15:49:40.478	2026-03-26 15:54:40.632
299	1	8	2026-03-26 15:54:40.477	2026-03-26 15:54:48.842
300	1	8	2026-03-26 15:54:40.477	2026-03-26 15:54:48.93
301	83	8231	2026-03-26 15:14:55.901	2026-03-26 17:32:09.079
302	83	300	2026-03-26 17:32:26.871	2026-03-26 17:37:27.897
303	83	300	2026-03-26 17:37:26.887	2026-03-26 17:42:27.843
304	83	300	2026-03-26 17:42:26.886	2026-03-26 17:47:28.228
305	83	300	2026-03-26 17:47:26.895	2026-03-26 17:52:27.797
306	83	300	2026-03-26 17:52:26.914	2026-03-26 17:57:27.769
307	83	300	2026-03-26 17:57:26.928	2026-03-26 18:02:32.237
308	83	300	2026-03-26 18:02:26.944	2026-03-26 18:07:28.298
309	83	300	2026-03-26 18:07:26.948	2026-03-26 18:12:28.694
310	83	300	2026-03-26 18:12:26.963	2026-03-26 18:17:27.807
311	83	300	2026-03-26 18:17:26.978	2026-03-26 18:22:27.98
312	83	300	2026-03-26 18:22:26.993	2026-03-26 18:27:27.869
313	83	300	2026-03-26 18:27:27.008	2026-03-26 18:32:27.883
314	83	300	2026-03-26 18:32:27.023	2026-03-26 18:37:27.85
315	83	300	2026-03-26 18:37:27.097	2026-03-26 18:42:27.905
316	83	300	2026-03-26 18:42:27.1	2026-03-26 18:47:28.584
317	83	300	2026-03-26 18:47:27.101	2026-03-26 18:52:28.803
318	83	300	2026-03-26 18:52:27.152	2026-03-26 18:57:28.295
319	83	300	2026-03-26 18:57:27.157	2026-03-26 19:02:27.877
320	83	300	2026-03-26 19:02:27.162	2026-03-26 19:07:28.226
321	83	300	2026-03-26 19:07:10.455	2026-03-26 19:12:10.831
322	83	195	2026-03-26 19:12:10.459	2026-03-26 19:15:26.101
323	83	7	2026-03-26 19:15:25.693	2026-03-26 19:15:32.489
324	83	15	2026-03-26 19:15:32.417	2026-03-26 19:15:47.331
325	83	7	2026-03-26 19:15:47.254	2026-03-26 19:15:54.301
326	83	5	2026-03-26 19:15:54.223	2026-03-26 19:15:59.64
327	83	229	2026-03-26 19:15:59.568	2026-03-26 19:19:48.666
328	83	300	2026-03-26 19:19:48.285	2026-03-26 19:24:48.348
329	83	300	2026-03-26 19:24:48.286	2026-03-26 19:29:48.664
330	83	300	2026-03-26 19:29:48.288	2026-03-26 19:34:48.671
331	83	300	2026-03-26 19:34:48.291	2026-03-26 19:39:48.68
332	83	300	2026-03-26 19:39:48.302	2026-03-26 19:44:48.68
333	83	300	2026-03-26 19:39:46.315	2026-03-26 19:44:49.154
334	83	300	2026-03-26 19:44:46.317	2026-03-26 19:49:47.328
335	83	300	2026-03-26 19:44:48.303	2026-03-26 19:49:48.688
336	83	300	2026-03-26 19:49:46.328	2026-03-26 19:54:47.232
337	83	300	2026-03-26 19:49:48.319	2026-03-26 19:54:48.699
338	83	281	2026-03-26 19:54:46.329	2026-03-26 19:59:27.295
339	83	300	2026-03-26 19:54:48.321	2026-03-26 19:59:48.687
340	83	300	2026-03-26 19:59:48.32	2026-03-26 20:04:48.7
341	83	300	2026-03-26 20:04:48.321	2026-03-26 20:09:48.701
342	83	300	2026-03-26 20:06:31.827	2026-03-26 20:11:32.382
343	83	300	2026-03-26 20:09:48.332	2026-03-26 20:14:48.721
344	85	300	2026-03-26 20:13:05.353	2026-03-26 20:18:05.561
345	83	300	2026-03-26 20:14:48.348	2026-03-26 20:19:48.738
346	85	300	2026-03-26 20:18:05.362	2026-03-26 20:23:06.158
347	83	300	2026-03-26 20:19:48.363	2026-03-26 20:24:48.75
348	85	187	2026-03-26 20:23:05.363	2026-03-26 20:26:17.763
349	83	300	2026-03-26 20:24:48.365	2026-03-26 20:29:48.73
350	85	300	2026-03-26 20:26:17.953	2026-03-26 20:31:18.484
351	83	300	2026-03-26 20:29:48.364	2026-03-26 20:34:48.73
352	85	300	2026-03-26 20:31:17.954	2026-03-26 20:36:18.688
353	83	300	2026-03-26 20:34:48.366	2026-03-26 20:39:48.743
354	85	300	2026-03-26 20:36:17.956	2026-03-26 20:41:18.488
355	85	84	2026-03-26 20:41:17.989	2026-03-26 20:42:42.15
356	83	300	2026-03-26 20:39:48.367	2026-03-26 20:44:48.731
357	85	300	2026-03-26 20:43:15.91	2026-03-26 20:48:16.585
358	83	300	2026-03-26 20:44:48.368	2026-03-26 20:49:48.749
359	85	164	2026-03-26 20:48:15.929	2026-03-26 20:50:59.561
360	83	300	2026-03-26 20:49:48.371	2026-03-26 20:54:48.728
361	85	104	2026-03-26 20:55:05.603	2026-03-26 20:56:49.41
362	83	300	2026-03-26 20:54:48.369	2026-03-26 20:59:54.897
363	85	44	2026-03-26 21:07:31.203	2026-03-26 21:08:15.346
364	85	300	2026-03-26 21:10:03.864	2026-03-26 21:15:11.55
365	85	300	2026-03-26 21:15:03.872	2026-03-26 21:20:04.598
366	85	300	2026-03-26 21:20:03.873	2026-03-26 21:25:04.497
367	85	300	2026-03-26 21:25:03.885	2026-03-26 21:30:04.613
368	85	300	2026-03-26 21:30:03.887	2026-03-26 21:35:04.545
369	85	88	2026-03-26 21:35:03.89	2026-03-26 21:36:32.368
370	85	236	2026-03-26 21:37:04.737	2026-03-26 21:41:00.428
371	85	60	2026-03-26 21:41:04.932	2026-03-26 21:42:05.461
372	85	300	2026-03-26 21:50:13.286	2026-03-26 21:55:13.786
373	85	189	2026-03-26 21:56:51.731	2026-03-26 22:00:01.089
374	85	100	2026-03-26 22:00:20.783	2026-03-26 22:02:00.63
375	85	48	2026-03-26 22:02:02.977	2026-03-26 22:02:51.087
376	85	300	2026-03-26 22:03:00.44	2026-03-26 22:08:01.061
377	85	36	2026-03-26 22:08:00.452	2026-03-26 22:08:36.838
378	85	1097	2026-03-26 22:08:00.452	2026-03-26 22:26:28.666
379	85	39	2026-03-26 22:26:17.799	2026-03-26 22:26:56.939
380	83	114	2026-03-27 00:18:15.001	2026-03-27 00:20:09.86
381	83	114	2026-03-27 00:18:15.001	2026-03-27 00:20:09.861
382	85	300	2026-03-27 00:21:15.537	2026-03-27 00:26:16.058
383	85	300	2026-03-27 00:26:15.55	2026-03-27 00:31:15.667
384	83	300	2026-03-27 00:28:44.462	2026-03-27 00:33:44.856
385	83	251	2026-03-27 00:31:59.766	2026-03-27 00:36:12.358
386	83	300	2026-03-27 00:33:44.464	2026-03-27 00:38:44.867
387	83	300	2026-03-27 00:52:10.146	2026-03-27 00:57:10.725
388	85	300	2026-03-27 01:03:31.426	2026-03-27 01:08:31.852
389	85	300	2026-03-27 01:08:31.439	2026-03-27 01:13:31.906
390	83	117	2026-03-27 01:17:09.155	2026-03-27 01:19:06.35
391	83	19	2026-03-27 01:19:10.712	2026-03-27 01:19:30.044
392	83	300	2026-03-27 01:26:06.724	2026-03-27 01:31:06.816
393	83	32	2026-03-27 01:31:06.739	2026-03-27 01:31:38.572
394	83	60	2026-03-27 01:31:41.171	2026-03-27 01:32:41.011
395	83	300	2026-03-27 01:32:57.244	2026-03-27 01:37:57.378
396	83	297	2026-03-27 01:38:56.234	2026-03-27 01:43:53.277
397	83	35	2026-03-27 01:44:07.379	2026-03-27 01:44:42.842
398	83	14	2026-03-27 01:44:50.114	2026-03-27 01:45:04.263
399	83	14	2026-03-27 01:44:50.114	2026-03-27 01:45:04.299
400	83	110	2026-03-27 01:59:55.457	2026-03-27 02:01:45.377
401	83	300	2026-03-27 02:01:51.33	2026-03-27 02:06:51.57
402	83	13	2026-03-27 02:06:51.343	2026-03-27 02:07:04.175
403	85	300	2026-03-27 02:12:11.62	2026-03-27 02:17:11.827
404	83	300	2026-03-27 02:25:26.848	2026-03-27 02:30:27.018
405	83	268	2026-03-27 02:33:45.966	2026-03-27 02:38:14.46
406	85	91	2026-03-27 02:42:24.778	2026-03-27 02:43:55.568
407	85	75	2026-03-27 02:44:37.244	2026-03-27 02:45:52.867
408	85	300	2026-03-27 02:48:53.656	2026-03-27 02:53:53.727
409	85	93	2026-03-27 02:53:53.671	2026-03-27 02:55:26.4
410	85	300	2026-03-27 02:57:48.914	2026-03-27 03:02:48.997
411	85	300	2026-03-27 03:02:48.916	2026-03-27 03:07:48.999
412	85	253	2026-03-27 03:07:48.916	2026-03-27 03:12:02.141
413	85	300	2026-03-27 03:19:53.262	2026-03-27 03:24:53.483
414	85	300	2026-03-27 03:24:53.274	2026-03-27 03:29:53.505
415	83	53	2026-03-27 03:30:22.365	2026-03-27 03:31:15.817
416	83	300	2026-03-27 03:37:04.899	2026-03-27 03:42:05.183
417	85	35	2026-03-27 03:44:54.683	2026-03-27 03:45:29.286
418	85	197	2026-03-27 03:46:37.925	2026-03-27 03:49:55.231
419	85	131	2026-03-27 03:49:54.684	2026-03-27 03:52:05.329
420	85	163	2026-03-27 03:52:11.81	2026-03-27 03:54:54.766
421	85	285	2026-03-27 03:54:54.685	2026-03-27 03:59:40.111
422	85	24	2026-03-27 04:15:10.276	2026-03-27 04:15:34.017
423	85	300	2026-03-27 04:25:09.219	2026-03-27 04:30:10.234
424	83	300	2026-03-27 04:40:49.809	2026-03-27 04:45:49.883
425	83	300	2026-03-27 04:45:49.811	2026-03-27 04:50:49.955
426	83	300	2026-03-27 04:50:49.811	2026-03-27 04:55:49.903
427	83	9	2026-03-27 04:55:49.812	2026-03-27 04:55:59.233
428	1	300	2026-03-27 09:54:43.838	2026-03-27 09:59:44.008
429	1	9	2026-03-27 09:59:43.841	2026-03-27 09:59:52.617
430	1	9	2026-03-27 09:59:43.841	2026-03-27 09:59:52.708
431	83	300	2026-03-27 10:00:50.784	2026-03-27 10:05:51.055
432	83	269	2026-03-27 10:05:50.793	2026-03-27 10:10:19.68
433	83	135	2026-03-27 10:10:22.211	2026-03-27 10:12:37.512
434	83	8	2026-03-27 10:13:06.901	2026-03-27 10:13:15.052
435	83	17	2026-03-27 10:24:15.556	2026-03-27 10:24:33.281
436	83	96	2026-03-27 10:34:40.874	2026-03-27 10:36:16.899
437	83	300	2026-03-27 10:45:19.293	2026-03-27 10:50:19.42
438	83	300	2026-03-27 10:50:19.294	2026-03-27 10:55:19.653
439	83	300	2026-03-27 10:55:19.303	2026-03-27 11:00:19.553
440	83	300	2026-03-27 11:00:19.304	2026-03-27 11:05:19.604
441	83	300	2026-03-27 11:05:19.306	2026-03-27 11:10:19.587
442	83	300	2026-03-27 11:10:19.318	2026-03-27 11:15:19.601
443	83	300	2026-03-27 11:15:19.319	2026-03-27 11:20:19.583
444	83	127	2026-03-27 11:20:19.321	2026-03-27 11:22:26.746
445	83	5	2026-03-27 12:23:22.025	2026-03-27 12:23:27.361
446	83	300	2026-03-27 12:25:25.202	2026-03-27 12:30:25.342
447	83	300	2026-03-27 12:30:25.211	2026-03-27 12:35:25.619
448	83	300	2026-03-27 12:35:25.211	2026-03-27 12:40:25.366
449	83	300	2026-03-27 12:40:25.212	2026-03-27 12:45:25.358
450	83	300	2026-03-27 12:45:25.212	2026-03-27 12:50:25.297
451	83	300	2026-03-27 12:50:25.212	2026-03-27 12:55:25.318
452	83	300	2026-03-27 12:55:25.213	2026-03-27 13:00:25.483
453	83	300	2026-03-27 13:00:25.227	2026-03-27 13:05:25.694
454	83	275	2026-03-27 13:05:25.227	2026-03-27 13:10:00.188
455	83	300	2026-03-27 13:10:09.419	2026-03-27 13:15:09.709
456	83	153	2026-03-27 13:15:09.432	2026-03-27 13:17:42.838
457	83	300	2026-03-27 13:17:42.536	2026-03-27 13:22:42.807
458	83	300	2026-03-27 13:22:42.541	2026-03-27 13:27:43.534
459	83	300	2026-03-27 13:27:42.548	2026-03-27 13:32:42.836
460	83	24	2026-03-27 13:32:42.549	2026-03-27 13:33:07.384
461	83	300	2026-03-27 13:33:09.949	2026-03-27 13:38:10.284
462	83	300	2026-03-27 13:38:09.955	2026-03-27 13:43:10.253
463	83	59	2026-03-27 13:45:20.383	2026-03-27 13:46:20.088
464	85	81	2026-03-27 13:49:13.602	2026-03-27 13:50:34.951
465	85	300	2026-03-27 13:56:02.022	2026-03-27 14:01:02.118
466	85	300	2026-03-27 14:01:02.032	2026-03-27 14:06:02.165
467	85	300	2026-03-27 14:06:02.031	2026-03-27 14:11:02.097
468	85	285	2026-03-27 14:11:02.033	2026-03-27 14:15:47.394
469	85	300	2026-03-27 14:17:43.127	2026-03-27 14:22:43.199
470	85	300	2026-03-27 14:22:43.132	2026-03-27 14:27:43.179
471	85	161	2026-03-27 14:27:43.129	2026-03-27 14:30:24.047
472	85	94	2026-03-27 14:30:25.12	2026-03-27 14:31:58.793
473	85	300	2026-03-27 14:32:30.707	2026-03-27 14:37:31.313
474	85	300	2026-03-27 14:37:30.708	2026-03-27 14:42:30.797
475	85	252	2026-03-27 14:42:30.71	2026-03-27 14:46:42.495
476	85	300	2026-03-27 14:47:53.282	2026-03-27 14:52:53.77
477	85	300	2026-03-27 14:52:53.298	2026-03-27 14:57:53.788
478	85	300	2026-03-27 14:57:53.299	2026-03-27 15:02:53.741
479	85	300	2026-03-27 15:02:53.3	2026-03-27 15:07:53.739
480	85	300	2026-03-27 15:07:53.302	2026-03-27 15:12:53.65
481	85	300	2026-03-27 15:12:53.303	2026-03-27 15:17:53.814
482	85	300	2026-03-27 15:17:53.305	2026-03-27 15:22:53.62
483	85	300	2026-03-27 15:22:53.307	2026-03-27 15:27:53.567
484	85	300	2026-03-27 15:27:53.309	2026-03-27 15:32:53.508
485	85	300	2026-03-27 15:32:53.311	2026-03-27 15:37:53.382
486	85	300	2026-03-27 15:37:53.312	2026-03-27 15:42:53.36
487	85	300	2026-03-27 15:42:53.314	2026-03-27 15:47:53.434
488	83	300	2026-03-27 15:56:38.226	2026-03-27 16:01:38.249
489	83	48	2026-03-27 16:01:38.227	2026-03-27 16:02:26.003
490	83	8	2026-03-27 16:02:27.611	2026-03-27 16:02:35.978
491	83	15	2026-03-27 16:09:19.054	2026-03-27 16:09:34.058
492	83	300	2026-03-27 16:10:02.639	2026-03-27 16:15:02.629
493	83	300	2026-03-27 16:15:02.641	2026-03-27 16:20:02.677
494	1	300	2026-03-27 16:36:18.217	2026-03-27 16:41:18.391
495	1	300	2026-03-27 16:41:18.221	2026-03-27 16:46:18.665
496	1	300	2026-03-27 16:46:18.221	2026-03-27 16:51:18.384
497	83	300	2026-03-27 16:48:47.717	2026-03-27 16:53:47.819
498	83	82	2026-03-27 16:53:47.73	2026-03-27 16:55:09.719
499	1	300	2026-03-27 16:51:18.223	2026-03-27 16:56:18.381
500	1	300	2026-03-27 16:56:18.222	2026-03-27 17:01:18.389
501	1	32	2026-03-27 17:01:18.225	2026-03-27 17:01:50.476
502	1	32	2026-03-27 17:01:18.225	2026-03-27 17:01:50.578
503	1	243	2026-03-27 17:02:15.44	2026-03-27 17:06:18.379
504	1	300	2026-03-27 17:06:18.225	2026-03-27 17:11:18.38
505	1	300	2026-03-27 17:11:18.226	2026-03-27 17:16:18.663
506	1	300	2026-03-27 17:16:18.228	2026-03-27 17:21:18.389
507	1	300	2026-03-27 17:26:44.753	2026-03-27 17:31:45.589
508	83	6	2026-03-27 17:33:25.281	2026-03-27 17:33:32.48
509	1	77	2026-03-27 17:33:36.645	2026-03-27 17:34:53.919
510	1	77	2026-03-27 17:33:36.645	2026-03-27 17:34:53.921
511	1	12	2026-03-27 17:36:32.651	2026-03-27 17:36:44.938
512	85	300	2026-03-27 17:34:26.6	2026-03-27 17:39:26.815
513	1	300	2026-03-27 17:36:44.756	2026-03-27 17:41:44.935
514	85	300	2026-03-27 17:39:26.603	2026-03-27 17:44:26.708
515	1	300	2026-03-27 17:41:44.757	2026-03-27 17:46:44.942
516	85	300	2026-03-27 17:44:26.602	2026-03-27 17:49:26.764
517	1	300	2026-03-27 17:46:44.757	2026-03-27 17:51:44.944
518	85	300	2026-03-27 17:49:26.604	2026-03-27 17:54:26.729
519	1	300	2026-03-27 17:51:44.759	2026-03-27 17:56:44.95
520	85	300	2026-03-27 17:54:26.605	2026-03-27 17:59:26.754
521	85	300	2026-03-27 17:59:26.606	2026-03-27 18:04:26.781
522	1	300	2026-03-27 18:01:05.308	2026-03-27 18:06:05.5
523	85	236	2026-03-27 18:04:26.607	2026-03-27 18:08:22.473
524	1	300	2026-03-27 18:06:05.311	2026-03-27 18:11:05.493
525	85	300	2026-03-27 18:08:32.695	2026-03-27 18:13:32.854
526	1	300	2026-03-27 18:11:05.312	2026-03-27 18:16:05.494
527	1	100	2026-03-27 18:16:05.313	2026-03-27 18:17:45.914
528	85	253	2026-03-27 18:13:32.707	2026-03-27 18:17:46.074
529	1	300	2026-03-27 18:17:45.439	2026-03-27 18:22:45.616
530	85	300	2026-03-27 18:17:48.792	2026-03-27 18:22:48.923
531	1	300	2026-03-27 18:22:45.442	2026-03-27 18:27:45.622
532	85	300	2026-03-27 18:22:48.801	2026-03-27 18:27:48.931
533	1	300	2026-03-27 18:27:45.444	2026-03-27 18:32:45.613
534	85	300	2026-03-27 18:27:48.814	2026-03-27 18:32:48.92
535	1	166	2026-03-27 18:32:45.445	2026-03-27 18:35:31.475
536	1	166	2026-03-27 18:32:45.445	2026-03-27 18:35:31.551
537	1	14	2026-03-27 18:36:25.43	2026-03-27 18:36:39.815
538	1	14	2026-03-27 18:36:25.43	2026-03-27 18:36:39.816
539	1	56	2026-03-27 18:36:49.647	2026-03-27 18:37:45.618
540	85	300	2026-03-27 18:32:48.815	2026-03-27 18:37:48.954
541	1	60	2026-03-27 18:37:45.445	2026-03-27 18:38:45.21
542	1	60	2026-03-27 18:37:45.445	2026-03-27 18:38:45.218
543	1	31	2026-03-27 18:40:25.587	2026-03-27 18:40:56.299
544	1	31	2026-03-27 18:40:25.587	2026-03-27 18:40:56.314
545	1	73	2026-03-27 18:41:32.813	2026-03-27 18:42:45.622
546	1	300	2026-03-27 18:42:45.445	2026-03-27 18:47:45.613
547	1	68	2026-03-27 18:47:45.448	2026-03-27 18:48:53.469
548	1	68	2026-03-27 18:47:45.448	2026-03-27 18:48:53.564
549	83	75	2026-03-27 18:49:43.567	2026-03-27 18:50:59.462
550	83	75	2026-03-27 18:49:43.567	2026-03-27 18:50:59.465
551	1	175	2026-03-27 18:51:56.78	2026-03-27 18:54:52.308
552	1	175	2026-03-27 18:51:56.78	2026-03-27 18:54:52.314
553	83	9	2026-03-27 18:55:54.491	2026-03-27 18:56:03.934
554	83	9	2026-03-27 18:55:54.491	2026-03-27 18:56:03.935
555	1	110	2026-03-27 18:56:56.782	2026-03-27 18:58:46.755
556	1	110	2026-03-27 18:56:56.782	2026-03-27 18:58:46.763
557	1	131	2026-03-27 18:59:28.296	2026-03-27 19:01:39.039
558	1	131	2026-03-27 18:59:28.296	2026-03-27 19:01:39.041
559	1	38	2026-03-27 19:03:17.612	2026-03-27 19:03:56.186
560	1	38	2026-03-27 19:03:17.612	2026-03-27 19:03:56.187
561	83	300	2026-03-27 19:00:09.544	2026-03-27 19:05:10.272
562	1	23	2026-03-27 19:09:03.218	2026-03-27 19:09:26.816
563	1	23	2026-03-27 19:09:03.218	2026-03-27 19:09:26.819
564	1	38	2026-03-27 19:10:37.014	2026-03-27 19:11:14.811
565	1	38	2026-03-27 19:10:37.014	2026-03-27 19:11:14.818
566	1	8	2026-03-27 19:12:01.934	2026-03-27 19:12:10.285
567	1	8	2026-03-27 19:12:01.934	2026-03-27 19:12:10.286
568	83	187	2026-03-27 19:09:17.912	2026-03-27 19:12:25.13
569	83	187	2026-03-27 19:09:17.912	2026-03-27 19:12:25.133
570	85	2118	2026-03-27 18:37:48.816	2026-03-27 19:13:16.897
571	83	300	2026-03-27 19:09:26.052	2026-03-27 19:14:26.295
572	1	64	2026-03-27 19:14:59.161	2026-03-27 19:16:03.364
573	1	64	2026-03-27 19:14:59.161	2026-03-27 19:16:03.373
574	83	36	2026-03-27 19:17:58.476	2026-03-27 19:18:35.066
575	83	36	2026-03-27 19:17:58.476	2026-03-27 19:18:35.069
576	1	66	2026-03-27 19:18:25.425	2026-03-27 19:19:31.184
577	1	274	2026-03-27 19:19:31.02	2026-03-27 19:24:04.999
578	1	274	2026-03-27 19:19:31.02	2026-03-27 19:24:05.081
579	83	111	2026-03-27 19:26:07.6	2026-03-27 19:27:58.897
580	83	6	2026-03-27 19:27:58.625	2026-03-27 19:28:04.94
581	83	6	2026-03-27 19:27:58.625	2026-03-27 19:28:05.341
582	1	102	2026-03-27 19:26:57.461	2026-03-27 19:28:39.962
583	1	102	2026-03-27 19:26:57.461	2026-03-27 19:28:39.963
584	85	56	2026-03-27 19:28:16.095	2026-03-27 19:29:12.181
585	1	103	2026-03-27 19:29:25.354	2026-03-27 19:31:08.512
586	1	103	2026-03-27 19:29:25.354	2026-03-27 19:31:08.517
587	1	28	2026-03-27 19:33:57.719	2026-03-27 19:34:25.577
588	85	300	2026-03-27 19:29:26.322	2026-03-27 19:34:26.606
589	85	278	2026-03-27 19:34:26.335	2026-03-27 19:39:04.518
590	1	293	2026-03-27 19:34:25.357	2026-03-27 19:39:18.742
591	1	293	2026-03-27 19:34:25.357	2026-03-27 19:39:18.853
592	1	183	2026-03-27 19:41:22.032	2026-03-27 19:44:25.53
593	85	300	2026-03-27 19:39:30.456	2026-03-27 19:44:44.546
594	85	120	2026-03-27 19:44:30.165	2026-03-27 19:46:29.875
595	1	34	2026-03-27 19:46:12.28	2026-03-27 19:46:46.05
596	1	34	2026-03-27 19:46:12.28	2026-03-27 19:46:46.104
597	1	73	2026-03-27 19:48:05.09	2026-03-27 19:49:18.211
598	1	73	2026-03-27 19:48:05.09	2026-03-27 19:49:18.212
599	1	8	2026-03-27 19:50:20.694	2026-03-27 19:50:29.12
600	1	8	2026-03-27 19:50:20.694	2026-03-27 19:50:29.148
601	1	156	2026-03-27 19:51:49.819	2026-03-27 19:54:25.634
602	85	32	2026-03-27 19:55:41.115	2026-03-27 19:56:13.269
603	83	47	2026-03-27 19:57:53.655	2026-03-27 19:58:41.482
604	83	9	2026-03-27 19:58:45.991	2026-03-27 19:58:55.218
605	1	300	2026-03-27 19:54:25.361	2026-03-27 19:59:25.535
606	1	70	2026-03-27 19:59:25.362	2026-03-27 20:00:35.873
607	1	70	2026-03-27 19:59:25.362	2026-03-27 20:00:35.971
608	1	133	2026-03-27 20:02:12.234	2026-03-27 20:04:25.534
609	1	41	2026-03-27 20:04:25.363	2026-03-27 20:05:06.168
610	1	41	2026-03-27 20:04:25.363	2026-03-27 20:05:06.169
611	1	24	2026-03-27 20:05:12.349	2026-03-27 20:05:36.806
612	1	24	2026-03-27 20:05:12.349	2026-03-27 20:05:36.814
613	1	40	2026-03-27 20:06:51.67	2026-03-27 20:07:31.797
614	1	40	2026-03-27 20:06:51.67	2026-03-27 20:07:31.803
615	1	41	2026-03-27 20:07:37.225	2026-03-27 20:08:18.332
616	1	41	2026-03-27 20:07:37.225	2026-03-27 20:08:18.333
617	1	45	2026-03-27 20:08:40.351	2026-03-27 20:09:25.535
618	1	5	2026-03-27 20:09:25.364	2026-03-27 20:09:29.974
619	1	5	2026-03-27 20:09:25.364	2026-03-27 20:09:29.985
620	1	69	2026-03-27 20:11:03.347	2026-03-27 20:12:12.786
621	1	69	2026-03-27 20:11:03.347	2026-03-27 20:12:12.834
622	1	18	2026-03-27 20:15:45.776	2026-03-27 20:16:03.519
623	1	300	2026-03-27 20:16:03.35	2026-03-27 20:21:03.521
624	83	62	2026-03-27 20:20:05.974	2026-03-27 20:21:08.608
625	83	62	2026-03-27 20:20:05.974	2026-03-27 20:21:09.061
626	1	300	2026-03-27 20:21:03.35	2026-03-27 20:26:03.536
627	1	300	2026-03-27 20:26:03.352	2026-03-27 20:31:03.545
628	1	300	2026-03-27 20:31:03.352	2026-03-27 20:36:03.526
629	1	300	2026-03-27 20:36:03.355	2026-03-27 20:41:03.543
630	1	300	2026-03-27 20:41:03.357	2026-03-27 20:46:03.566
631	1	300	2026-03-27 20:46:03.355	2026-03-27 20:51:03.516
632	85	7	2026-03-27 20:52:18.829	2026-03-27 20:52:26.391
633	85	300	2026-03-27 20:53:03.032	2026-03-27 20:58:03.368
634	85	300	2026-03-27 20:58:03.036	2026-03-27 21:03:03.286
635	85	220	2026-03-27 21:03:03.037	2026-03-27 21:06:43.789
636	85	190	2026-03-27 21:19:43.559	2026-03-27 21:22:53.679
637	85	28	2026-03-27 22:00:46.406	2026-03-27 22:01:15.036
638	85	28	2026-03-27 22:00:46.406	2026-03-27 22:01:15.107
639	85	300	2026-03-27 22:01:30.917	2026-03-27 22:06:31.161
640	83	300	2026-03-27 22:10:19.461	2026-03-27 22:15:19.772
641	83	300	2026-03-27 22:15:19.462	2026-03-27 22:20:19.679
642	83	170	2026-03-27 22:20:19.463	2026-03-27 22:23:09.144
643	83	58	2026-03-27 22:31:58.616	2026-03-27 22:32:57.187
644	83	6	2026-03-27 22:33:11.184	2026-03-27 22:33:17.729
645	85	25	2026-03-27 22:33:57.12	2026-03-27 22:34:22.073
646	83	25	2026-03-27 22:35:14.022	2026-03-27 22:35:39.418
647	83	197	2026-03-27 22:35:52.398	2026-03-27 22:39:09.377
648	85	300	2026-03-27 22:34:25.926	2026-03-27 22:39:25.985
649	83	74	2026-03-27 22:39:19.1	2026-03-27 22:40:33.63
650	85	300	2026-03-27 22:39:25.928	2026-03-27 22:44:26.009
651	85	300	2026-03-27 22:44:25.943	2026-03-27 22:49:26.007
652	83	300	2026-03-27 23:07:46.924	2026-03-27 23:12:47.553
653	83	300	2026-03-27 23:12:46.929	2026-03-27 23:17:47.152
654	83	300	2026-03-27 23:17:46.927	2026-03-27 23:22:47.081
655	83	199	2026-03-27 23:22:46.928	2026-03-27 23:26:05.857
656	83	300	2026-03-27 23:31:16.33	2026-03-27 23:36:16.403
657	83	52	2026-03-27 23:36:16.339	2026-03-27 23:37:08.14
658	83	11	2026-03-27 23:37:15.768	2026-03-27 23:37:26.584
659	83	300	2026-03-27 23:37:31.534	2026-03-27 23:42:31.615
660	83	10	2026-03-27 23:42:31.549	2026-03-27 23:42:41.812
661	83	300	2026-03-27 23:42:42.274	2026-03-27 23:47:42.342
662	83	300	2026-03-27 23:47:42.278	2026-03-27 23:52:42.342
663	83	300	2026-03-27 23:52:42.28	2026-03-27 23:57:42.35
664	83	300	2026-03-27 23:57:42.282	2026-03-28 00:02:42.656
665	83	300	2026-03-28 00:02:42.283	2026-03-28 00:07:42.668
666	83	300	2026-03-28 00:07:42.287	2026-03-28 00:12:42.664
667	83	300	2026-03-28 00:12:42.286	2026-03-28 00:17:42.662
668	83	300	2026-03-28 00:17:42.288	2026-03-28 00:22:42.654
669	83	300	2026-03-28 00:22:42.289	2026-03-28 00:27:42.653
670	83	300	2026-03-28 00:27:42.289	2026-03-28 00:32:42.656
671	83	300	2026-03-28 00:32:42.291	2026-03-28 00:37:42.654
672	83	300	2026-03-28 00:37:42.291	2026-03-28 00:42:42.654
673	83	300	2026-03-28 00:42:42.292	2026-03-28 00:47:42.668
674	83	300	2026-03-28 00:47:42.293	2026-03-28 00:52:42.668
676	83	291	2026-03-28 07:46:28.514	2026-03-28 07:51:19.433
677	83	164	2026-03-28 08:07:23.3	2026-03-28 08:10:07.1
678	83	78	2026-03-28 08:41:54.446	2026-03-28 08:43:13.049
679	83	78	2026-03-28 08:41:54.446	2026-03-28 08:43:13.051
680	83	112	2026-03-28 08:43:57.397	2026-03-28 08:45:49.416
681	83	35	2026-03-28 08:55:15.793	2026-03-28 08:57:54.905
682	83	300	2026-03-28 09:12:28.46	2026-03-28 09:17:29.272
683	83	72	2026-03-28 09:17:28.461	2026-03-28 09:18:40.823
684	83	22	2026-03-28 09:54:55.082	2026-03-28 09:55:17.078
685	83	24	2026-03-28 10:02:05.06	2026-03-28 10:02:29.171
686	83	119	2026-03-28 10:09:49.495	2026-03-28 10:11:49.006
687	83	48	2026-03-28 10:22:01.161	2026-03-28 10:22:48.955
688	83	48	2026-03-28 10:24:46.955	2026-03-28 10:25:35.106
689	83	182	2026-03-28 10:32:32.656	2026-03-28 10:35:35.221
690	83	300	2026-03-28 10:35:50.772	2026-03-28 10:40:51.018
691	83	300	2026-03-28 10:59:35.872	2026-03-28 11:04:36.497
692	83	300	2026-03-28 11:04:35.883	2026-03-28 11:09:36.453
693	83	300	2026-03-28 11:09:35.893	2026-03-28 11:14:36.613
694	83	300	2026-03-28 11:14:35.927	2026-03-28 11:19:36.427
695	83	300	2026-03-28 11:19:35.944	2026-03-28 11:24:36.493
696	83	300	2026-03-28 11:24:35.944	2026-03-28 11:29:36.423
697	83	300	2026-03-28 11:29:35.968	2026-03-28 11:34:36.705
698	83	300	2026-03-28 11:34:35.968	2026-03-28 11:39:36.412
700	83	300	2026-03-28 11:39:35.969	2026-03-28 11:44:36.642
702	83	300	2026-03-28 11:44:35.969	2026-03-28 11:49:36.648
703	83	300	2026-03-28 11:49:35.97	2026-03-28 11:54:36.704
704	83	300	2026-03-28 11:54:35.97	2026-03-28 11:59:36.513
705	83	171	2026-03-28 11:59:35.984	2026-03-28 12:02:27.302
706	85	55	2026-03-28 13:21:30.984	2026-03-28 13:22:26.188
707	85	300	2026-03-28 14:34:36.547	2026-03-28 14:39:37.284
708	85	300	2026-03-28 14:39:36.565	2026-03-28 14:44:37.205
709	85	300	2026-03-28 14:44:36.564	2026-03-28 14:49:37.109
710	85	63	2026-03-28 14:49:36.565	2026-03-28 14:50:39.921
711	85	300	2026-03-28 15:11:54.017	2026-03-28 15:16:54.827
712	85	300	2026-03-28 15:16:54.029	2026-03-28 15:21:54.685
713	85	300	2026-03-28 15:38:38.772	2026-03-28 15:43:39.62
714	85	116	2026-03-28 15:43:38.784	2026-03-28 15:45:34.713
715	85	10	2026-03-28 15:45:48.631	2026-03-28 15:45:59.07
716	85	131	2026-03-28 15:48:38.13	2026-03-28 15:50:49.367
717	85	300	2026-03-28 15:50:48.646	2026-03-28 15:55:49.179
718	85	270	2026-03-28 15:55:48.65	2026-03-28 16:00:18.71
719	83	300	2026-03-28 16:01:00.299	2026-03-28 16:06:01.276
720	83	300	2026-03-28 16:06:00.3	2026-03-28 16:11:00.988
721	83	136	2026-03-28 16:11:00.306	2026-03-28 16:13:16.658
722	83	300	2026-03-28 16:13:36.408	2026-03-28 16:18:37.232
723	83	199	2026-03-28 16:18:36.41	2026-03-28 16:21:57.007
724	83	300	2026-03-28 16:22:26.766	2026-03-28 16:27:27.417
725	83	197	2026-03-28 16:27:26.767	2026-03-28 16:30:44.249
726	83	300	2026-03-28 16:34:11.867	2026-03-28 16:39:12.094
727	83	300	2026-03-28 16:39:11.869	2026-03-28 16:44:12.05
728	83	300	2026-03-28 16:47:25.723	2026-03-28 16:52:25.905
729	83	300	2026-03-28 16:52:25.726	2026-03-28 16:57:25.972
730	83	300	2026-03-28 16:57:25.726	2026-03-28 17:02:25.97
731	83	300	2026-03-28 17:02:25.726	2026-03-28 17:07:25.951
732	83	300	2026-03-28 17:07:25.727	2026-03-28 17:12:36.763
733	83	300	2026-03-28 17:12:25.728	2026-03-28 17:17:25.914
734	83	300	2026-03-28 17:17:25.729	2026-03-28 17:22:25.961
735	83	223	2026-03-28 17:22:25.73	2026-03-28 17:26:09.299
736	83	41	2026-03-28 17:26:50.439	2026-03-28 17:27:31.902
737	83	300	2026-03-28 17:30:02.53	2026-03-28 17:35:02.792
738	83	300	2026-03-28 17:35:02.546	2026-03-28 17:40:02.697
739	83	130	2026-03-28 17:40:02.544	2026-03-28 17:42:12.347
740	83	141	2026-03-28 17:45:30.633	2026-03-28 17:47:51.347
741	83	300	2026-03-28 17:54:51.327	2026-03-28 17:59:51.7
742	83	300	2026-03-28 17:59:51.33	2026-03-28 18:04:51.484
743	83	71	2026-03-28 18:04:51.331	2026-03-28 18:06:02.776
744	86	46	2026-03-28 18:09:31.232	2026-03-28 18:10:17.206
745	86	46	2026-03-28 18:09:31.232	2026-03-28 18:10:17.21
746	1	218	2026-03-28 18:19:16.699	2026-03-28 18:22:54.677
747	1	218	2026-03-28 18:19:16.699	2026-03-28 18:22:54.681
748	1	65	2026-03-28 18:27:07.801	2026-03-28 18:28:12.72
749	1	65	2026-03-28 18:27:07.801	2026-03-28 18:28:12.781
750	83	300	2026-03-28 19:06:50.464	2026-03-28 19:11:50.688
751	83	300	2026-03-28 19:11:50.469	2026-03-28 19:16:51.043
752	83	300	2026-03-28 19:13:07.284	2026-03-28 19:18:07.346
753	83	300	2026-03-28 19:18:07.286	2026-03-28 19:23:07.352
754	83	185	2026-03-28 19:21:40.044	2026-03-28 19:24:45.499
755	83	185	2026-03-28 19:21:40.044	2026-03-28 19:24:45.504
756	83	300	2026-03-28 19:20:08.874	2026-03-28 19:25:09.173
757	83	73	2026-03-28 19:25:27.19	2026-03-28 19:26:40.219
758	83	57	2026-03-28 19:26:40.047	2026-03-28 19:27:37.276
759	83	57	2026-03-28 19:26:40.047	2026-03-28 19:27:37.284
760	83	300	2026-03-28 19:23:07.287	2026-03-28 19:28:07.342
761	83	300	2026-03-28 19:25:08.879	2026-03-28 19:30:09.208
762	83	211	2026-03-28 19:28:09.306	2026-03-28 19:31:40.214
763	83	300	2026-03-28 19:30:08.877	2026-03-28 19:35:09.188
764	83	300	2026-03-28 19:31:40.048	2026-03-28 19:36:40.218
765	83	300	2026-03-28 19:35:08.877	2026-03-28 19:40:09.176
766	83	130	2026-03-28 19:41:05.168	2026-03-28 19:43:15.765
767	83	130	2026-03-28 19:41:05.168	2026-03-28 19:43:15.767
768	83	272	2026-03-28 19:40:08.878	2026-03-28 19:44:41.533
769	83	272	2026-03-28 19:40:08.878	2026-03-28 19:44:41.589
770	83	46	2026-03-28 19:44:23.031	2026-03-28 19:45:09.246
771	83	46	2026-03-28 19:44:23.031	2026-03-28 19:45:09.252
772	83	300	2026-03-28 19:44:55.98	2026-03-28 19:49:56.313
773	83	63	2026-03-28 19:49:55.991	2026-03-28 19:50:59.424
774	83	256	2026-03-28 19:46:49.646	2026-03-28 19:51:05.334
775	83	300	2026-03-28 19:51:05.171	2026-03-28 19:56:05.335
776	83	300	2026-03-28 19:56:05.173	2026-03-28 20:01:05.333
777	83	299	2026-03-28 19:56:48.155	2026-03-28 20:01:47.969
778	83	18	2026-03-28 20:01:47.582	2026-03-28 20:02:06.098
779	83	68	2026-03-28 20:01:05.174	2026-03-28 20:02:13.816
780	83	68	2026-03-28 20:01:05.174	2026-03-28 20:02:13.918
781	83	20	2026-03-28 20:02:47.51	2026-03-28 20:03:07.764
782	83	20	2026-03-28 20:02:47.51	2026-03-28 20:03:07.764
783	83	224	2026-03-28 20:04:16.354	2026-03-28 20:08:00.942
816	83	48	2026-03-28 21:49:16.679	2026-03-28 21:50:04.398
817	83	48	2026-03-28 21:49:16.679	2026-03-28 21:50:04.401
818	83	300	2026-03-28 21:55:56.611	2026-03-28 22:00:56.836
819	83	30	2026-03-28 22:05:55.807	2026-03-28 22:06:26.322
820	83	30	2026-03-28 22:05:55.807	2026-03-28 22:06:26.323
821	83	59	2026-03-28 22:06:49.135	2026-03-28 22:07:48.693
822	83	59	2026-03-28 22:06:49.135	2026-03-28 22:07:48.695
823	83	181	2026-03-28 22:07:54.512	2026-03-28 22:10:55.97
824	83	25	2026-03-28 22:10:55.81	2026-03-28 22:11:21.448
825	83	25	2026-03-28 22:10:55.81	2026-03-28 22:11:21.449
826	83	5	2026-03-28 22:52:03.039	2026-03-28 22:52:07.884
827	83	5	2026-03-28 22:52:03.039	2026-03-28 22:52:07.898
828	83	39	2026-03-29 00:05:12.031	2026-03-29 00:05:51.615
829	83	39	2026-03-29 00:05:12.031	2026-03-29 00:05:51.617
830	83	6	2026-03-29 00:05:56.009	2026-03-29 00:06:02.679
831	83	6	2026-03-29 00:05:56.009	2026-03-29 00:06:02.679
832	83	38	2026-03-29 00:08:40.901	2026-03-29 00:09:19.385
833	83	38	2026-03-29 00:08:40.901	2026-03-29 00:09:19.391
834	83	224	2026-03-29 00:10:34.67	2026-03-29 00:14:18.656
835	83	224	2026-03-29 00:10:34.67	2026-03-29 00:14:18.661
836	83	133	2026-03-29 00:18:22.137	2026-03-29 00:20:34.843
837	83	245	2026-03-29 00:20:34.673	2026-03-29 00:24:39.858
838	83	245	2026-03-29 00:20:34.673	2026-03-29 00:24:39.942
839	83	52	2026-03-29 00:27:14.929	2026-03-29 00:28:07.311
840	83	36	2026-03-29 00:44:58.948	2026-03-29 00:45:34.836
841	83	25	2026-03-29 00:45:34.677	2026-03-29 00:46:00.231
842	83	25	2026-03-29 00:45:34.677	2026-03-29 00:46:00.231
843	83	9	2026-03-29 00:47:38.75	2026-03-29 00:47:48.334
844	83	9	2026-03-29 00:47:38.75	2026-03-29 00:47:48.335
845	83	89	2026-03-29 00:50:35.512	2026-03-29 00:52:04.89
846	83	89	2026-03-29 00:50:35.512	2026-03-29 00:52:04.896
847	83	24	2026-03-29 00:52:17.244	2026-03-29 00:52:41.404
848	83	24	2026-03-29 00:52:17.244	2026-03-29 00:52:41.409
849	83	27	2026-03-29 00:52:50.369	2026-03-29 00:53:17.216
850	83	27	2026-03-29 00:52:50.369	2026-03-29 00:53:17.221
851	83	8	2026-03-29 00:53:20.655	2026-03-29 00:53:29.16
852	83	8	2026-03-29 00:53:20.655	2026-03-29 00:53:29.159
853	83	11	2026-03-29 00:53:57.613	2026-03-29 00:54:08.983
854	83	11	2026-03-29 00:53:57.613	2026-03-29 00:54:08.986
855	83	84	2026-03-29 00:54:11.019	2026-03-29 00:55:34.944
856	83	28	2026-03-29 00:55:34.678	2026-03-29 00:56:03.255
857	83	28	2026-03-29 00:55:34.678	2026-03-29 00:56:03.257
858	83	82	2026-03-29 00:57:51.068	2026-03-29 00:59:13.382
859	83	82	2026-03-29 00:57:51.068	2026-03-29 00:59:13.383
860	83	66	2026-03-29 01:02:05.07	2026-03-29 01:03:11.36
861	83	66	2026-03-29 01:02:05.07	2026-03-29 01:03:11.36
862	83	7	2026-03-29 01:05:34.68	2026-03-29 01:05:41.558
863	83	7	2026-03-29 01:05:34.68	2026-03-29 01:05:41.56
864	83	33	2026-03-29 01:14:37.634	2026-03-29 01:15:10.809
865	83	33	2026-03-29 01:14:37.634	2026-03-29 01:15:10.81
866	83	13	2026-03-29 01:16:04.671	2026-03-29 01:16:17.926
867	83	13	2026-03-29 01:16:04.671	2026-03-29 01:16:17.932
868	83	19	2026-03-29 01:16:46.264	2026-03-29 01:17:05.841
869	83	19	2026-03-29 01:16:46.264	2026-03-29 01:17:05.848
870	83	8	2026-03-29 01:19:04.84	2026-03-29 01:19:13.433
871	83	8	2026-03-29 01:19:04.84	2026-03-29 01:19:13.44
872	83	24	2026-03-29 01:20:54.205	2026-03-29 01:21:18.731
873	83	24	2026-03-29 01:20:54.205	2026-03-29 01:21:18.732
874	83	10	2026-03-29 01:22:28.66	2026-03-29 01:22:39.227
875	83	10	2026-03-29 01:22:28.66	2026-03-29 01:22:39.234
876	83	41	2026-03-29 01:22:47.552	2026-03-29 01:23:28.506
877	83	41	2026-03-29 01:22:47.552	2026-03-29 01:23:28.509
878	83	7	2026-03-29 01:23:57.956	2026-03-29 01:24:05.132
879	83	7	2026-03-29 01:23:57.956	2026-03-29 01:24:05.134
880	83	9	2026-03-29 01:24:44.62	2026-03-29 01:24:54.252
881	83	9	2026-03-29 01:24:44.62	2026-03-29 01:24:54.253
882	83	10	2026-03-29 01:25:07.891	2026-03-29 01:25:17.889
883	83	10	2026-03-29 01:25:07.891	2026-03-29 01:25:17.89
884	83	41	2026-03-29 01:29:06.075	2026-03-29 01:29:47.354
885	83	41	2026-03-29 01:29:06.075	2026-03-29 01:29:47.358
886	83	29	2026-03-29 01:29:53.03	2026-03-29 01:30:22.643
887	83	29	2026-03-29 01:29:53.03	2026-03-29 01:30:22.659
888	83	49	2026-03-29 01:31:03.879	2026-03-29 01:31:53.375
889	83	49	2026-03-29 01:31:03.879	2026-03-29 01:31:53.379
890	83	17	2026-03-29 01:35:38.378	2026-03-29 01:35:55.625
891	83	17	2026-03-29 01:35:38.378	2026-03-29 01:35:55.626
892	83	40	2026-03-29 01:36:07.879	2026-03-29 01:36:48.505
893	83	40	2026-03-29 01:36:07.879	2026-03-29 01:36:48.507
894	88	300	2026-03-29 01:34:21.831	2026-03-29 01:39:22.294
895	83	134	2026-03-29 01:38:21.1	2026-03-29 01:40:34.858
896	83	171	2026-03-29 01:40:34.69	2026-03-29 01:43:25.846
897	83	171	2026-03-29 01:40:34.69	2026-03-29 01:43:25.934
898	88	300	2026-03-29 01:39:21.832	2026-03-29 01:44:21.994
899	83	43	2026-03-29 01:43:46.399	2026-03-29 01:44:29.686
900	83	43	2026-03-29 01:43:46.399	2026-03-29 01:44:29.688
901	83	7	2026-03-29 01:46:20.037	2026-03-29 01:46:27.125
902	83	7	2026-03-29 01:46:20.037	2026-03-29 01:46:27.134
903	83	62	2026-03-29 01:46:54.144	2026-03-29 01:47:56.031
904	83	62	2026-03-29 01:46:54.144	2026-03-29 01:47:56.037
905	83	8	2026-03-29 01:48:23.378	2026-03-29 01:48:31.134
906	83	8	2026-03-29 01:48:23.378	2026-03-29 01:48:31.138
907	88	300	2026-03-29 01:44:21.833	2026-03-29 01:49:22.085
908	83	53	2026-03-29 01:52:37.775	2026-03-29 01:53:31.376
909	83	53	2026-03-29 01:52:37.775	2026-03-29 01:53:31.378
910	88	300	2026-03-29 01:49:21.835	2026-03-29 01:54:22.065
911	83	63	2026-03-29 01:54:03.563	2026-03-29 01:55:06.872
912	83	63	2026-03-29 01:54:03.563	2026-03-29 01:55:06.878
913	83	101	2026-03-29 01:56:16.466	2026-03-29 01:57:57.271
914	83	101	2026-03-29 01:56:16.466	2026-03-29 01:57:57.275
915	83	18	2026-03-29 01:58:24.467	2026-03-29 01:58:43.018
916	83	18	2026-03-29 01:58:24.467	2026-03-29 01:58:43.019
917	88	300	2026-03-29 01:54:21.836	2026-03-29 01:59:22.064
918	83	116	2026-03-29 01:59:12.891	2026-03-29 02:01:09.063
919	88	300	2026-03-29 01:59:21.837	2026-03-29 02:04:22.026
920	83	266	2026-03-29 02:01:08.893	2026-03-29 02:05:35.375
921	83	266	2026-03-29 02:01:08.893	2026-03-29 02:05:35.466
922	83	123	2026-03-29 02:06:09.365	2026-03-29 02:08:12.323
923	83	123	2026-03-29 02:06:09.365	2026-03-29 02:08:12.334
924	88	300	2026-03-29 02:04:21.839	2026-03-29 02:09:22.595
925	83	170	2026-03-29 02:08:18.791	2026-03-29 02:11:09.058
926	88	300	2026-03-29 02:09:21.84	2026-03-29 02:14:22.052
927	83	300	2026-03-29 02:11:08.896	2026-03-29 02:16:09.06
928	88	300	2026-03-29 02:14:21.841	2026-03-29 02:19:22.05
929	88	43	2026-03-29 02:19:21.842	2026-03-29 02:20:05.094
930	83	187	2026-03-29 02:18:01.83	2026-03-29 02:21:09.062
931	83	210	2026-03-29 02:21:08.899	2026-03-29 02:24:38.791
932	83	210	2026-03-29 02:21:08.899	2026-03-29 02:24:38.876
933	83	38	2026-03-29 02:24:54.453	2026-03-29 02:25:32.217
934	83	38	2026-03-29 02:24:54.453	2026-03-29 02:25:32.224
935	83	16	2026-03-29 02:25:41.343	2026-03-29 02:25:57.861
936	83	16	2026-03-29 02:25:41.343	2026-03-29 02:25:57.87
937	83	5	2026-03-29 02:26:03.552	2026-03-29 02:26:09.064
938	83	67	2026-03-29 02:26:15.573	2026-03-29 02:27:22.982
939	83	67	2026-03-29 02:26:15.573	2026-03-29 02:27:22.997
940	83	74	2026-03-29 02:28:32.64	2026-03-29 02:29:46.777
941	83	74	2026-03-29 02:28:32.64	2026-03-29 02:29:46.78
942	83	36	2026-03-29 02:30:39.919	2026-03-29 02:31:15.738
943	1	89	2026-03-29 02:31:55.847	2026-03-29 02:33:24.874
944	83	130	2026-03-29 02:31:15.576	2026-03-29 02:33:25.77
945	83	130	2026-03-29 02:31:15.576	2026-03-29 02:33:25.805
946	83	11	2026-03-29 02:33:39.359	2026-03-29 02:33:50.965
947	83	11	2026-03-29 02:33:39.359	2026-03-29 02:33:50.963
948	83	9	2026-03-29 02:34:30.806	2026-03-29 02:34:40.37
949	83	9	2026-03-29 02:34:30.806	2026-03-29 02:34:40.372
950	83	10	2026-03-29 02:34:55.548	2026-03-29 02:35:05.256
951	83	10	2026-03-29 02:34:55.548	2026-03-29 02:35:05.26
952	83	15	2026-03-29 02:35:21.595	2026-03-29 02:35:36.834
953	83	15	2026-03-29 02:35:21.595	2026-03-29 02:35:36.84
954	83	23	2026-03-29 02:35:52.264	2026-03-29 02:36:15.742
955	83	70	2026-03-29 02:36:15.579	2026-03-29 02:37:25.451
956	83	70	2026-03-29 02:36:15.579	2026-03-29 02:37:25.46
957	83	228	2026-03-29 02:37:28.025	2026-03-29 02:41:15.75
958	1	300	2026-03-29 02:37:51.731	2026-03-29 02:42:51.832
959	1	300	2026-03-29 02:37:57.952	2026-03-29 02:42:58.02
960	83	300	2026-03-29 02:41:15.58	2026-03-29 02:46:16.035
961	83	300	2026-03-29 02:46:15.581	2026-03-29 02:51:15.753
962	83	44	2026-03-29 02:52:46.466	2026-03-29 02:53:30.707
963	83	44	2026-03-29 02:52:46.466	2026-03-29 02:53:30.715
964	83	5	2026-03-29 02:53:34.157	2026-03-29 02:53:39.301
965	83	5	2026-03-29 02:53:34.157	2026-03-29 02:53:39.302
966	83	42	2026-03-29 02:54:48.537	2026-03-29 02:55:30.911
967	83	42	2026-03-29 02:54:48.537	2026-03-29 02:55:30.914
968	83	52	2026-03-29 02:55:32.116	2026-03-29 02:56:24.055
969	83	52	2026-03-29 02:55:32.116	2026-03-29 02:56:24.061
970	83	78	2026-03-29 02:56:28.004	2026-03-29 02:57:46.627
971	83	124	2026-03-29 02:57:46.469	2026-03-29 02:59:50.728
972	83	124	2026-03-29 02:57:46.469	2026-03-29 02:59:50.736
973	83	172	2026-03-29 02:59:54.687	2026-03-29 03:02:46.643
974	83	68	2026-03-29 03:02:46.47	2026-03-29 03:03:55.102
975	83	68	2026-03-29 03:02:46.47	2026-03-29 03:03:55.105
976	83	104	2026-03-29 03:04:02.104	2026-03-29 03:05:46.356
977	83	104	2026-03-29 03:04:02.104	2026-03-29 03:05:46.364
978	83	100	2026-03-29 03:05:49.891	2026-03-29 03:07:30.494
979	83	100	2026-03-29 03:05:49.891	2026-03-29 03:07:30.5
980	83	7	2026-03-29 03:07:39.828	2026-03-29 03:07:46.631
981	83	143	2026-03-29 03:07:46.472	2026-03-29 03:10:09.437
982	83	143	2026-03-29 03:07:46.472	2026-03-29 03:10:09.439
983	83	83	2026-03-29 03:10:39.294	2026-03-29 03:12:02.95
984	83	83	2026-03-29 03:10:39.294	2026-03-29 03:12:02.948
985	83	8	2026-03-29 03:12:38.83	2026-03-29 03:12:46.629
986	83	17	2026-03-29 03:12:46.472	2026-03-29 03:13:03.312
987	83	17	2026-03-29 03:12:46.472	2026-03-29 03:13:03.314
988	83	82	2026-03-29 03:13:52.607	2026-03-29 03:15:14.652
989	83	82	2026-03-29 03:13:52.607	2026-03-29 03:15:14.657
990	83	29	2026-03-29 03:15:45.787	2026-03-29 03:16:14.788
991	83	29	2026-03-29 03:15:45.787	2026-03-29 03:16:14.794
992	83	16	2026-03-29 03:21:17.107	2026-03-29 03:21:33.148
993	83	16	2026-03-29 03:21:17.107	2026-03-29 03:21:33.15
995	83	46	2026-03-29 03:22:10.36	2026-03-29 03:22:56.615
994	83	46	2026-03-29 03:22:10.36	2026-03-29 03:22:56.617
996	83	33	2026-03-29 03:25:01.232	2026-03-29 03:25:34.288
997	83	33	2026-03-29 03:25:01.232	2026-03-29 03:25:34.295
998	1	32	2026-03-29 03:28:34.237	2026-03-29 03:29:06.341
999	1	32	2026-03-29 03:28:34.237	2026-03-29 03:29:06.344
1000	83	94	2026-03-29 03:27:32.23	2026-03-29 03:29:06.436
1001	83	94	2026-03-29 03:27:32.23	2026-03-29 03:29:06.44
1002	83	7	2026-03-29 03:44:19.411	2026-03-29 03:44:26.713
1003	83	7	2026-03-29 03:44:19.411	2026-03-29 03:44:26.711
1004	83	47	2026-03-29 03:44:36.336	2026-03-29 03:45:23.92
1005	83	47	2026-03-29 03:44:36.336	2026-03-29 03:45:23.922
1006	83	37	2026-03-29 03:45:27.715	2026-03-29 03:46:04.996
1007	83	37	2026-03-29 03:45:27.715	2026-03-29 03:46:04.997
1008	83	41	2026-03-29 03:52:34.959	2026-03-29 03:53:16.602
1009	83	41	2026-03-29 03:52:34.959	2026-03-29 03:53:16.604
1010	83	21	2026-03-29 03:53:58.496	2026-03-29 03:54:19.582
1011	83	61	2026-03-29 03:54:19.414	2026-03-29 03:55:20.336
1012	83	61	2026-03-29 03:54:19.414	2026-03-29 03:55:20.339
1013	83	10	2026-03-29 03:56:36.508	2026-03-29 03:56:46.787
1014	83	10	2026-03-29 03:56:36.508	2026-03-29 03:56:46.789
1015	83	5	2026-03-29 03:57:05.198	2026-03-29 03:57:10.047
1016	83	5	2026-03-29 03:57:05.198	2026-03-29 03:57:10.048
1017	83	17	2026-03-29 03:57:27.405	2026-03-29 03:57:44.523
1018	83	17	2026-03-29 03:57:27.405	2026-03-29 03:57:44.528
1019	83	7	2026-03-29 03:58:33.13	2026-03-29 03:58:40.787
1020	83	7	2026-03-29 03:58:33.13	2026-03-29 03:58:40.789
1021	83	24	2026-03-29 03:59:59.724	2026-03-29 04:00:23.54
1022	83	24	2026-03-29 03:59:59.724	2026-03-29 04:00:23.546
1023	83	21	2026-03-29 04:00:29.934	2026-03-29 04:00:51.583
1024	83	21	2026-03-29 04:00:29.934	2026-03-29 04:00:51.582
1025	83	16	2026-03-29 04:00:53.933	2026-03-29 04:01:10.236
1026	83	16	2026-03-29 04:00:53.933	2026-03-29 04:01:10.238
1027	83	27	2026-03-29 04:04:03.009	2026-03-29 04:04:29.693
1028	83	27	2026-03-29 04:04:03.009	2026-03-29 04:04:29.696
1029	83	31	2026-03-29 04:05:07.619	2026-03-29 04:05:38.47
1030	83	31	2026-03-29 04:05:07.619	2026-03-29 04:05:38.473
1031	83	190	2026-03-29 04:05:53.209	2026-03-29 04:09:03.171
1032	83	9	2026-03-29 04:09:03.011	2026-03-29 04:09:12.673
1033	83	9	2026-03-29 04:09:03.011	2026-03-29 04:09:12.678
1034	83	34	2026-03-29 04:09:29.865	2026-03-29 04:10:04.476
1035	83	34	2026-03-29 04:09:29.865	2026-03-29 04:10:04.48
1036	83	29	2026-03-29 04:11:04.9	2026-03-29 04:11:34.222
1037	83	29	2026-03-29 04:11:04.9	2026-03-29 04:11:34.223
1038	83	90	2026-03-29 04:11:53.515	2026-03-29 04:13:23.337
1039	83	90	2026-03-29 04:11:53.515	2026-03-29 04:13:23.339
1040	83	76	2026-03-29 04:14:03.013	2026-03-29 04:15:19.117
1041	83	76	2026-03-29 04:14:03.013	2026-03-29 04:15:19.122
1042	83	52	2026-03-29 04:15:55.101	2026-03-29 04:16:47.747
1043	83	52	2026-03-29 04:15:55.101	2026-03-29 04:16:47.827
1044	83	22	2026-03-29 04:20:02.18	2026-03-29 04:20:24.233
1045	83	22	2026-03-29 04:20:02.18	2026-03-29 04:20:24.232
1046	83	15	2026-03-29 04:22:13.204	2026-03-29 04:22:28.314
1047	83	15	2026-03-29 04:22:13.204	2026-03-29 04:22:28.321
1048	83	45	2026-03-29 04:23:18.051	2026-03-29 04:24:03.182
1049	83	98	2026-03-29 04:24:03.016	2026-03-29 04:25:40.815
1050	83	98	2026-03-29 04:24:03.016	2026-03-29 04:25:40.818
1051	83	39	2026-03-29 04:26:34.973	2026-03-29 04:27:13.762
1052	83	39	2026-03-29 04:26:34.973	2026-03-29 04:27:13.765
1053	83	31	2026-03-29 04:27:59.553	2026-03-29 04:28:30.511
1054	83	31	2026-03-29 04:27:59.553	2026-03-29 04:28:30.518
1055	83	157	2026-03-29 04:29:31.724	2026-03-29 04:32:08.467
1056	83	157	2026-03-29 04:29:31.724	2026-03-29 04:32:08.472
1057	83	104	2026-03-29 04:32:19.424	2026-03-29 04:34:03.182
1058	83	118	2026-03-29 04:34:03.019	2026-03-29 04:36:01.263
1059	83	118	2026-03-29 04:34:03.019	2026-03-29 04:36:01.267
1060	83	8	2026-03-29 04:37:47.596	2026-03-29 04:37:56.07
1061	83	8	2026-03-29 04:37:47.596	2026-03-29 04:37:56.072
1062	83	27	2026-03-29 04:40:52	2026-03-29 04:41:19.324
1063	83	27	2026-03-29 04:40:52	2026-03-29 04:41:19.325
1064	83	87	2026-03-29 04:41:43.964	2026-03-29 04:43:11.198
1065	83	87	2026-03-29 04:41:43.964	2026-03-29 04:43:11.202
1066	83	29	2026-03-29 04:52:32.96	2026-03-29 04:53:02.593
1067	83	29	2026-03-29 04:52:32.96	2026-03-29 04:53:02.592
1068	83	80	2026-03-29 04:53:16.481	2026-03-29 04:54:36.497
1069	83	82	2026-03-29 04:54:36.333	2026-03-29 04:55:58.583
1070	83	82	2026-03-29 04:54:36.333	2026-03-29 04:55:58.59
1071	83	15	2026-03-29 04:56:06.116	2026-03-29 04:56:21.336
1072	83	15	2026-03-29 04:56:06.116	2026-03-29 04:56:21.337
1073	83	101	2026-03-29 04:56:27.706	2026-03-29 04:58:09.364
1074	83	101	2026-03-29 04:56:27.706	2026-03-29 04:58:09.365
1075	83	83	2026-03-29 04:58:13.057	2026-03-29 04:59:36.495
1076	83	115	2026-03-29 05:06:02.908	2026-03-29 05:07:57.853
1077	83	115	2026-03-29 05:06:02.908	2026-03-29 05:07:57.855
1078	83	65	2026-03-29 05:08:25.558	2026-03-29 05:09:30.862
1079	83	65	2026-03-29 05:08:25.558	2026-03-29 05:09:30.863
1080	83	88	2026-03-29 05:09:35	2026-03-29 05:11:03.072
1081	83	130	2026-03-29 05:11:02.911	2026-03-29 05:13:13.424
1082	83	130	2026-03-29 05:11:02.911	2026-03-29 05:13:13.427
1083	83	24	2026-03-29 05:15:39.022	2026-03-29 05:16:03.08
1084	83	259	2026-03-29 05:16:02.913	2026-03-29 05:20:21.968
1085	83	259	2026-03-29 05:16:02.913	2026-03-29 05:20:22.032
1117	83	300	2026-03-29 21:51:46.311	2026-03-29 21:56:46.486
1118	83	300	2026-03-29 21:58:58.885	2026-03-29 22:03:59.049
1119	83	172	2026-03-29 22:03:58.889	2026-03-29 22:06:51.308
1120	83	172	2026-03-29 22:03:58.889	2026-03-29 22:06:51.31
1121	83	65	2026-03-29 22:12:30.443	2026-03-29 22:13:35.608
1122	83	65	2026-03-29 22:12:30.443	2026-03-29 22:13:35.609
1123	83	214	2026-03-29 22:15:24.416	2026-03-29 22:18:59.048
1124	83	8	2026-03-29 22:22:12.31	2026-03-29 22:22:19.991
1125	83	8	2026-03-29 22:22:12.31	2026-03-29 22:22:19.992
1126	83	6	2026-03-29 22:23:30.336	2026-03-29 22:23:36.025
1127	83	6	2026-03-29 22:23:30.336	2026-03-29 22:23:36.028
1128	83	118	2026-03-29 22:23:42.123	2026-03-29 22:25:40.249
1129	83	118	2026-03-29 22:23:42.123	2026-03-29 22:25:40.257
1130	83	73	2026-03-29 22:25:59.617	2026-03-29 22:27:12.473
1131	83	259	2026-03-29 22:28:22.83	2026-03-29 22:32:41.894
1132	83	259	2026-03-29 22:28:22.83	2026-03-29 22:32:41.898
1133	83	31	2026-03-29 22:32:51.81	2026-03-29 22:33:22.995
1134	83	17	2026-03-29 22:33:22.834	2026-03-29 22:33:39.832
1135	83	17	2026-03-29 22:33:22.834	2026-03-29 22:33:39.834
1136	83	24	2026-03-29 22:33:41.408	2026-03-29 22:34:05.86
1137	83	24	2026-03-29 22:33:41.408	2026-03-29 22:34:05.861
1138	83	6	2026-03-29 22:34:14.59	2026-03-29 22:34:20.713
1139	83	6	2026-03-29 22:34:14.59	2026-03-29 22:34:20.714
1140	83	14	2026-03-29 22:34:27.397	2026-03-29 22:34:41.179
1141	83	14	2026-03-29 22:34:27.397	2026-03-29 22:34:41.191
1142	83	158	2026-03-29 22:35:27.784	2026-03-29 22:38:06.522
1143	83	158	2026-03-29 22:35:27.784	2026-03-29 22:38:06.523
1144	83	72	2026-03-29 22:38:27.388	2026-03-29 22:39:39.834
1145	83	72	2026-03-29 22:38:27.388	2026-03-29 22:39:39.836
1146	83	21	2026-03-29 22:44:25.645	2026-03-29 22:44:47.076
1147	83	21	2026-03-29 22:44:25.645	2026-03-29 22:44:47.081
1148	83	12	2026-03-29 22:45:58.416	2026-03-29 22:46:10.82
1149	83	12	2026-03-29 22:45:58.416	2026-03-29 22:46:10.822
1150	83	47	2026-03-29 22:51:23.776	2026-03-29 22:52:11.082
1151	83	47	2026-03-29 22:51:23.776	2026-03-29 22:52:11.08
1152	83	71	2026-03-29 22:51:59.078	2026-03-29 22:53:10.074
1153	83	71	2026-03-29 22:51:59.078	2026-03-29 22:53:10.077
1154	83	130	2026-03-29 22:58:33.793	2026-03-29 23:00:44.426
1155	83	130	2026-03-29 22:58:33.793	2026-03-29 23:00:44.435
1156	83	135	2026-03-29 22:58:38.317	2026-03-29 23:00:53.719
1157	83	135	2026-03-29 22:58:38.317	2026-03-29 23:00:53.719
1158	83	51	2026-03-29 23:02:42.316	2026-03-29 23:03:33.957
1159	83	46	2026-03-29 23:03:19.771	2026-03-29 23:04:06.539
1160	83	46	2026-03-29 23:03:19.771	2026-03-29 23:04:06.543
1161	83	95	2026-03-29 23:04:32.866	2026-03-29 23:06:07.877
1162	83	95	2026-03-29 23:04:32.866	2026-03-29 23:06:07.878
1163	83	149	2026-03-29 23:06:06.586	2026-03-29 23:08:35.641
1164	83	149	2026-03-29 23:06:06.586	2026-03-29 23:08:35.646
1165	83	57	2026-03-29 23:08:33.642	2026-03-29 23:09:31.175
1166	83	57	2026-03-29 23:08:33.642	2026-03-29 23:09:31.176
1167	83	15	2026-03-29 23:12:41.33	2026-03-29 23:12:56.185
1168	83	15	2026-03-29 23:12:41.33	2026-03-29 23:12:56.194
1169	83	11	2026-03-29 23:15:38.543	2026-03-29 23:15:49.927
1170	83	11	2026-03-29 23:15:38.543	2026-03-29 23:15:49.926
1171	83	300	2026-03-29 23:12:05.196	2026-03-29 23:17:05.668
1172	83	19	2026-03-29 23:19:55.435	2026-03-29 23:20:14.617
1173	83	19	2026-03-29 23:19:55.435	2026-03-29 23:20:14.619
1174	83	251	2026-03-29 23:22:18.707	2026-03-29 23:26:30.364
1175	83	251	2026-03-29 23:22:18.707	2026-03-29 23:26:30.374
1176	83	84	2026-03-29 23:29:57.147	2026-03-29 23:31:21.332
1177	83	84	2026-03-29 23:29:57.147	2026-03-29 23:31:21.338
1178	83	122	2026-03-29 23:29:44.172	2026-03-29 23:31:46.13
1179	83	122	2026-03-29 23:29:44.172	2026-03-29 23:31:46.133
1180	83	38	2026-03-29 23:35:49.118	2026-03-29 23:36:28.02
1181	83	38	2026-03-29 23:35:49.118	2026-03-29 23:36:28.021
1182	83	83	2026-03-29 23:36:49.445	2026-03-29 23:38:13.203
1183	83	83	2026-03-29 23:36:49.445	2026-03-29 23:38:13.205
1187	83	25	2026-03-30 00:15:41.021	2026-03-30 00:16:06.45
1200	83	186	2026-03-30 00:50:06.981	2026-03-30 00:53:13.228
1201	83	186	2026-03-30 00:50:06.981	2026-03-30 00:53:13.23
1202	83	65	2026-03-30 00:53:16.117	2026-03-30 00:54:21.548
1203	83	278	2026-03-30 01:05:13.246	2026-03-30 01:09:51.662
1204	83	278	2026-03-30 01:05:13.246	2026-03-30 01:09:51.762
1205	83	19	2026-03-30 01:09:53.995	2026-03-30 01:10:13.641
1206	83	23	2026-03-30 01:11:13.817	2026-03-30 01:11:37.686
1207	83	23	2026-03-30 01:11:13.817	2026-03-30 01:11:37.684
1208	83	10	2026-03-30 01:11:39.663	2026-03-30 01:11:49.834
1209	83	10	2026-03-30 01:11:39.663	2026-03-30 01:11:49.843
1210	83	93	2026-03-30 01:12:31.541	2026-03-30 01:14:04.927
1211	83	93	2026-03-30 01:12:31.541	2026-03-30 01:14:04.928
1212	83	5	2026-03-30 01:14:29.096	2026-03-30 01:14:34.315
1213	83	5	2026-03-30 01:14:29.096	2026-03-30 01:14:34.316
1214	83	46	2026-03-30 01:16:20.509	2026-03-30 01:17:07.061
1215	83	9	2026-03-30 01:17:06.582	2026-03-30 01:17:16.239
1216	83	215	2026-03-30 01:17:15.706	2026-03-30 01:20:50.65
1217	83	215	2026-03-30 01:17:15.706	2026-03-30 01:20:50.653
1218	105	24	2026-03-30 07:13:51.983	2026-03-30 07:14:16.589
1219	105	62	2026-03-30 07:17:09.857	2026-03-30 07:18:12.58
1220	105	300	2026-03-30 07:15:33.311	2026-03-30 07:20:33.398
1221	105	89	2026-03-30 07:21:21.971	2026-03-30 07:22:51.292
1222	105	174	2026-03-30 07:20:33.328	2026-03-30 07:23:27.237
1223	83	95	2026-03-30 18:43:50.022	2026-03-30 18:45:24.976
1224	83	300	2026-03-30 18:45:52.88	2026-03-30 18:50:53.084
1225	83	46	2026-03-30 18:50:52.89	2026-03-30 18:51:39.638
1226	83	46	2026-03-30 18:50:52.89	2026-03-30 18:51:39.641
1227	83	10	2026-03-30 18:52:14.299	2026-03-30 18:52:24.724
1228	83	10	2026-03-30 18:52:14.299	2026-03-30 18:52:24.771
1229	83	266	2026-03-30 18:55:32.311	2026-03-30 18:59:59.001
1230	83	158	2026-03-30 18:59:58.748	2026-03-30 19:02:37.042
1231	83	8	2026-03-30 19:02:36.498	2026-03-30 19:02:45.072
1232	83	6	2026-03-30 19:02:45.286	2026-03-30 19:02:52.033
1233	83	258	2026-03-30 19:02:52.258	2026-03-30 19:07:10.734
1234	83	258	2026-03-30 19:02:52.258	2026-03-30 19:07:10.737
1235	105	60	2026-03-30 19:58:31.084	2026-03-30 19:59:31.876
1236	83	300	2026-03-30 19:55:59.721	2026-03-30 20:01:02.324
1237	83	45	2026-03-30 20:00:59.72	2026-03-30 20:01:47.296
1238	83	75	2026-03-30 20:19:11.014	2026-03-30 20:20:25.958
1239	83	10	2026-03-30 20:21:19.262	2026-03-30 20:21:30.137
1240	83	179	2026-03-30 20:19:04.097	2026-03-30 20:22:03.837
1241	83	179	2026-03-30 20:19:04.097	2026-03-30 20:22:03.838
1242	83	14	2026-03-30 20:23:28.565	2026-03-30 20:23:44.998
1243	83	14	2026-03-30 20:23:28.565	2026-03-30 20:23:45.03
1244	83	278	2026-03-30 20:23:50.166	2026-03-30 20:28:30.878
1245	83	15	2026-03-30 20:28:28.567	2026-03-30 20:28:45.749
1246	83	15	2026-03-30 20:28:28.567	2026-03-30 20:28:45.782
1247	83	282	2026-03-30 20:28:46.411	2026-03-30 20:33:30.894
1248	83	46	2026-03-30 20:35:06.261	2026-03-30 20:35:52.182
1249	83	9	2026-03-30 20:48:34.924	2026-03-30 20:48:44.224
1250	83	300	2026-03-30 20:47:04.135	2026-03-30 20:52:08.4
1251	83	31	2026-03-30 20:52:04.134	2026-03-30 20:52:37.448
1252	83	31	2026-03-30 20:52:04.134	2026-03-30 20:52:37.45
1253	83	288	2026-03-30 20:49:07.502	2026-03-30 20:53:55.521
1254	83	246	2026-03-30 20:52:58.445	2026-03-30 20:57:06.507
1255	83	300	2026-03-30 20:53:55.124	2026-03-30 20:58:55.589
1256	83	300	2026-03-30 20:57:04.134	2026-03-30 21:02:06.51
1257	83	300	2026-03-30 20:58:55.164	2026-03-30 21:03:55.576
1258	83	207	2026-03-30 21:03:55.186	2026-03-30 21:07:22.569
1259	83	274	2026-03-30 21:09:02.063	2026-03-30 21:13:38.442
1260	83	274	2026-03-30 21:09:02.063	2026-03-30 21:13:38.447
1261	83	25	2026-03-30 21:14:07.742	2026-03-30 21:14:35.04
1262	83	8	2026-03-30 21:24:30.64	2026-03-30 21:24:38.576
1263	83	300	2026-03-30 21:22:29.87	2026-03-30 21:27:32.596
1264	83	247	2026-03-30 21:26:04.075	2026-03-30 21:30:11.13
1265	83	92	2026-03-30 21:30:03.156	2026-03-30 21:31:35.183
1266	83	92	2026-03-30 21:30:03.156	2026-03-30 21:31:35.185
1267	83	186	2026-03-30 21:31:56.871	2026-03-30 21:35:03.322
1268	83	300	2026-03-30 21:30:20.754	2026-03-30 21:35:21.179
1269	83	103	2026-03-30 21:35:20.769	2026-03-30 21:37:03.781
1270	83	300	2026-03-30 21:35:03.161	2026-03-30 21:40:03.328
1271	83	300	2026-03-30 21:37:13.012	2026-03-30 21:42:13.454
1272	83	11	2026-03-30 21:42:13.057	2026-03-30 21:42:24.435
1273	83	300	2026-03-30 21:40:03.162	2026-03-30 21:45:03.332
1274	83	66	2026-03-30 21:45:03.162	2026-03-30 21:46:09.203
1275	83	66	2026-03-30 21:45:03.162	2026-03-30 21:46:09.21
1276	83	13	2026-03-30 21:47:06.226	2026-03-30 21:47:19.433
1277	83	13	2026-03-30 21:47:06.226	2026-03-30 21:47:19.434
1278	83	123	2026-03-30 21:47:59.726	2026-03-30 21:50:03.325
1279	83	184	2026-03-30 21:48:06.515	2026-03-30 21:51:11.216
1280	83	300	2026-03-30 21:50:03.164	2026-03-30 21:55:03.326
1281	83	300	2026-03-30 21:51:21.736	2026-03-30 21:56:22.152
1282	83	201	2026-03-30 21:56:21.756	2026-03-30 21:59:43.841
1283	83	300	2026-03-30 21:55:03.165	2026-03-30 22:00:03.329
1284	83	300	2026-03-30 22:03:32.742	2026-03-30 22:08:33.162
1285	83	300	2026-03-30 22:08:32.75	2026-03-30 22:13:33.183
1286	83	300	2026-03-30 22:13:32.788	2026-03-30 22:18:33.22
1287	83	125	2026-03-30 22:18:32.825	2026-03-30 22:20:38.538
1288	83	300	2026-03-30 22:19:41.487	2026-03-30 22:24:41.946
1289	83	300	2026-03-30 22:27:49.985	2026-03-30 22:32:50.157
1290	83	149	2026-03-31 09:20:40.213	2026-03-31 09:23:09.693
1291	83	149	2026-03-31 09:20:40.213	2026-03-31 09:23:09.691
1292	83	116	2026-03-31 09:23:44.607	2026-03-31 09:25:40.385
1293	83	300	2026-03-31 09:20:43.286	2026-03-31 09:25:43.705
1294	83	80	2026-03-31 09:25:43.293	2026-03-31 09:27:03.407
1295	83	133	2026-03-31 09:25:40.216	2026-03-31 09:27:52.957
1296	83	12	2026-03-31 09:27:59.733	2026-03-31 09:28:11.985
1327	83	78	2026-03-31 09:43:00.676	2026-03-31 09:44:19.109
1328	83	78	2026-03-31 09:43:00.676	2026-03-31 09:44:19.107
1329	83	300	2026-03-31 14:58:22.831	2026-03-31 15:03:23.006
1330	83	300	2026-03-31 15:00:44.812	2026-03-31 15:05:45.343
1331	83	300	2026-03-31 15:04:40.346	2026-03-31 15:09:40.532
1332	83	300	2026-03-31 15:05:44.853	2026-03-31 15:10:45.335
1333	83	300	2026-03-31 15:09:40.349	2026-03-31 15:14:40.535
1334	83	300	2026-03-31 15:10:44.854	2026-03-31 15:15:45.353
1335	83	160	2026-03-31 15:15:44.859	2026-03-31 15:18:25.826
1336	83	300	2026-03-31 15:14:40.35	2026-03-31 15:19:40.533
1337	83	300	2026-03-31 15:18:37.647	2026-03-31 15:23:38.167
1338	83	300	2026-03-31 15:19:40.351	2026-03-31 15:24:40.532
1339	83	300	2026-03-31 15:23:37.684	2026-03-31 15:28:38.194
1340	83	300	2026-03-31 15:24:40.353	2026-03-31 15:29:40.536
1341	83	300	2026-03-31 15:28:37.712	2026-03-31 15:33:38.23
1342	83	300	2026-03-31 15:29:40.353	2026-03-31 15:34:40.536
1343	83	300	2026-03-31 15:33:37.739	2026-03-31 15:38:38.25
1344	83	300	2026-03-31 15:34:40.354	2026-03-31 15:39:40.541
1345	83	300	2026-03-31 15:38:37.767	2026-03-31 15:43:38.251
1346	83	300	2026-03-31 15:39:40.355	2026-03-31 15:44:40.534
1347	83	300	2026-03-31 15:43:37.766	2026-03-31 15:48:38.264
1348	83	300	2026-03-31 15:44:40.356	2026-03-31 15:49:40.529
1349	83	300	2026-03-31 15:48:37.772	2026-03-31 15:53:38.275
1350	83	300	2026-03-31 15:49:40.356	2026-03-31 15:54:40.539
1351	83	105	2026-03-31 15:54:40.358	2026-03-31 15:56:25.167
1352	83	105	2026-03-31 15:54:40.358	2026-03-31 15:56:25.243
1353	83	300	2026-03-31 15:53:37.798	2026-03-31 15:58:38.314
1354	83	158	2026-03-31 15:57:02.361	2026-03-31 15:59:40.539
1355	83	157	2026-03-31 15:58:37.823	2026-03-31 16:01:15.799
1356	83	139	2026-03-31 16:01:15.438	2026-03-31 16:03:34.406
1357	83	139	2026-03-31 16:01:15.438	2026-03-31 16:03:34.411
1358	107	58	2026-03-31 16:05:03.681	2026-03-31 16:06:01.471
1359	83	152	2026-03-31 16:03:43.505	2026-03-31 16:06:15.605
1360	83	300	2026-03-31 16:06:15.441	2026-03-31 16:11:15.626
1361	107	40	2026-03-31 16:10:35.93	2026-03-31 16:11:16.638
1362	107	16	2026-03-31 16:12:30.136	2026-03-31 16:12:45.914
1363	83	300	2026-03-31 16:11:15.443	2026-03-31 16:16:15.627
1364	107	124	2026-03-31 16:23:23.2	2026-03-31 16:25:27.624
1365	83	300	2026-03-31 16:20:32.446	2026-03-31 16:25:32.638
1366	83	300	2026-03-31 16:25:32.449	2026-03-31 16:30:32.64
1367	107	77	2026-03-31 16:32:35.852	2026-03-31 16:33:52.74
1368	83	300	2026-03-31 16:30:32.45	2026-03-31 16:35:32.631
1369	107	300	2026-03-31 16:34:18.018	2026-03-31 16:39:18.277
1370	107	65	2026-03-31 16:39:18.026	2026-03-31 16:40:23.64
1371	83	300	2026-03-31 16:35:32.451	2026-03-31 16:40:32.628
1372	83	68	2026-03-31 16:40:32.453	2026-03-31 16:41:40.758
1373	83	68	2026-03-31 16:40:32.453	2026-03-31 16:41:40.855
1374	107	56	2026-03-31 16:41:04.741	2026-03-31 16:42:01.41
1375	83	18	2026-03-31 16:43:29.132	2026-03-31 16:43:47.523
1376	83	18	2026-03-31 16:43:29.132	2026-03-31 16:43:47.524
1377	83	300	2026-03-31 16:46:20.159	2026-03-31 16:51:20.345
1378	107	300	2026-03-31 16:47:06.275	2026-03-31 16:52:06.538
1379	107	300	2026-03-31 16:52:06.282	2026-03-31 16:57:06.544
1380	83	138	2026-03-31 16:58:22.584	2026-03-31 17:00:40.955
1381	107	300	2026-03-31 16:57:06.284	2026-03-31 17:02:06.558
1382	107	300	2026-03-31 17:02:06.292	2026-03-31 17:07:06.566
1383	107	145	2026-03-31 17:07:06.302	2026-03-31 17:09:31.249
1384	83	300	2026-04-01 15:01:30.976	2026-04-01 15:06:31.151
1385	83	87	2026-04-01 15:06:30.978	2026-04-01 15:07:58.435
1386	83	87	2026-04-01 15:06:30.978	2026-04-01 15:07:58.441
1387	83	29	2026-04-01 15:13:37.993	2026-04-01 15:14:07.466
1388	83	29	2026-04-01 15:13:37.993	2026-04-01 15:14:07.472
1389	83	6	2026-04-01 15:14:17.096	2026-04-01 15:14:22.964
1390	83	6	2026-04-01 15:14:17.096	2026-04-01 15:14:23.008
1391	83	49	2026-04-01 15:20:42.366	2026-04-01 15:21:31.16
1392	83	27	2026-04-01 15:21:30.985	2026-04-01 15:21:57.965
1393	83	27	2026-04-01 15:21:30.985	2026-04-01 15:21:57.967
1394	83	250	2026-04-01 15:22:09.854	2026-04-01 15:26:19.869
1395	83	250	2026-04-01 15:22:09.854	2026-04-01 15:26:19.873
1396	83	15	2026-04-01 15:29:15.952	2026-04-01 15:29:30.733
1397	83	15	2026-04-01 15:29:15.952	2026-04-01 15:29:30.734
1398	83	7	2026-04-01 15:29:51.622	2026-04-01 15:29:58.343
1399	83	7	2026-04-01 15:29:51.622	2026-04-01 15:29:58.344
1400	83	18	2026-04-01 15:30:02.898	2026-04-01 15:30:21.44
1401	83	18	2026-04-01 15:30:02.898	2026-04-01 15:30:21.441
1402	83	15	2026-04-01 15:31:15.778	2026-04-01 15:31:31.159
1403	83	143	2026-04-01 15:33:19.096	2026-04-01 15:35:42.502
1404	83	143	2026-04-01 15:33:19.096	2026-04-01 15:35:42.505
1405	83	6	2026-04-01 15:35:52.948	2026-04-01 15:35:59.56
1406	83	6	2026-04-01 15:35:52.948	2026-04-01 15:35:59.567
1407	83	44	2026-04-01 15:37:35.148	2026-04-01 15:38:19.28
1408	83	19	2026-04-01 16:13:00.461	2026-04-01 16:13:19.291
1409	83	176	2026-04-01 16:13:19.109	2026-04-01 16:16:15.472
1410	83	176	2026-04-01 16:13:19.109	2026-04-01 16:16:15.471
1411	83	38	2026-04-01 16:17:40.893	2026-04-01 16:18:19.279
1412	83	300	2026-04-01 16:18:19.11	2026-04-01 16:23:19.293
1413	83	300	2026-04-01 16:23:19.111	2026-04-01 16:28:19.281
1414	83	300	2026-04-01 16:28:19.114	2026-04-01 16:33:19.281
1415	83	300	2026-04-01 16:33:19.113	2026-04-01 16:38:19.282
1416	83	300	2026-04-01 16:38:19.114	2026-04-01 16:43:19.905
1417	83	300	2026-04-01 16:43:19.116	2026-04-01 16:48:19.283
1418	83	268	2026-04-01 16:48:19.116	2026-04-01 16:52:47.873
1419	83	268	2026-04-01 16:48:19.116	2026-04-01 16:52:47.962
1420	83	7	2026-04-01 16:53:04.896	2026-04-01 16:53:11.946
1421	83	7	2026-04-01 16:53:04.896	2026-04-01 16:53:11.956
1422	83	263	2026-04-01 17:18:55.908	2026-04-01 17:23:19.304
1423	83	300	2026-04-01 17:23:19.127	2026-04-01 17:28:19.315
1424	83	300	2026-04-01 17:28:19.129	2026-04-01 17:33:19.369
1425	83	111	2026-04-01 17:33:19.131	2026-04-01 17:35:10.677
1426	83	111	2026-04-01 17:33:19.131	2026-04-01 17:35:10.769
1427	83	191	2026-04-01 17:40:08.159	2026-04-01 17:43:19.364
1428	83	191	2026-04-01 17:40:08.159	2026-04-01 17:43:19.365
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, name, is_admin, avatar_url, created_at, username, preferred_role, bio, push_token, notifications_enabled, stripe_customer_id, last_seen_at, is_elite, stripe_subscription_id, elite_since, bonus_xp, game_xp, member_since, account_type, referral_code, referred_by, is_banned, skills, google_id, elite_xp_awarded, pending_elite_celebration, pending_elite_xp_awarded) FROM stdin;
105	info@thedodgeclub.co.uk	$2b$10$kpUpbqskISKToB8eLpHeieX8Yw3jlJuZLoGMAmxZ56d3p4ZMl/jMq	Jake	f	\N	2026-03-30 07:13:52.062366	\N	\N	\N	\N	f	cus_UF4IPnirbY6JaM	2026-03-30 20:18:49.325	f	\N	\N	25	0	\N	player	JAKE0105	\N	f	All Rounder	\N	f	f	f
87	jay@gmail.com	$2b$10$hhgywc/CZSYCWXL3j7cox.fmHPHtmtX8JJGbixjyKL.Bw3cxhqmsa	Jay	f	\N	2026-03-28 19:04:35.431154	\N	\N	\N	\N	f	\N	2026-03-28 19:06:35.504	f	\N	\N	25	0	\N	player	JAYX0087	\N	f	All Rounder	\N	f	f	f
83	quasonmatthews@gmail.com	$2b$10$t8ZnJ1kZU94IibclSRnhcuttaYBKwTNEFBysPquFtuwdkJV8n0Rp2	Quason	f	/objects/uploads/58e28058-c54a-47c6-bc11-c562c75fad47	2026-03-25 21:24:22.277096	Master Q	All-Rounder	Founder of the best Dodgeball community.	\N	f	cus_UDQ6SguUUhtkS3	2026-04-01 18:24:01.05	t	\N	2026-03-31 16:20:20.674	500	200	2024-09-20 00:00:00	player	QUAS0083	\N	f	All Rounder	\N	t	f	f
85	james@gmail.com	$2b$10$ysx7VusuCsPmSVsawuTjIeYjrPaLWDU4BCWXymiddc8mnkkq1D8yO	James	f	/objects/uploads/adcd0275-848b-4a07-954e-1049d5303864	2026-03-26 19:35:22.063107	\N	\N	\N	\N	f	cus_UDtmTUW7nBINOc	2026-03-28 23:19:00.097	f	\N	\N	0	55	\N	supporter	JAME0085	\N	f	\N	\N	f	f	f
86	testplayer1774721179971@test.com	$2b$10$iioksWpAR2z16R5bFRxwXuKeSBf3vUFtDqx8WO8a63mJxJxUZo4li	Test Player 1774721179971	f	\N	2026-03-28 18:09:31.206145	\N	\N	\N	\N	f	\N	2026-03-28 18:10:17.209	t	\N	2026-03-30 19:09:38.834	525	0	\N	supporter	TEST0086	\N	f	Throwing,Catching,Dodging	\N	t	t	t
106	test+1774897724245@example.com	$2b$10$o0VWdrwAsgc95F6ff4XqZ.a8BdsGV2hMCza3bYDlPyVM67fxpWXFK	Test Player	f	\N	2026-03-30 19:08:44.367492	\N	\N	\N	\N	f	\N	\N	f	\N	\N	25	0	\N	player	TEST0106	\N	f	\N	\N	f	f	f
1	admin@dodgeclub.com	$2a$10$f941o0TsgQnagXLKfAsoH.1aW6UT6xJcn1UHy2f//lOZvdOsGoRz2	Dodge Club HQ	t	\N	2026-03-25 00:03:13.032901	\N	\N	\N	\N	f	cus_UFHVJEGWRmkf8f	2026-04-01 18:24:01.072	f	\N	\N	0	0	\N	player	DODG0001	\N	f	\N	\N	f	f	f
88	guest@thedodgeclub.com	$2b$10$piRZmq2O3MT4TP/S4K8jIunstfm/uCUDpIuotmc4GMHJcB5wGZQda	Guest	f	\N	2026-03-29 01:34:21.722658	\N	\N	\N	\N	f	\N	2026-03-29 02:20:05.094	f	\N	\N	25	0	\N	player	GUES0088	\N	f	All Rounder	\N	f	f	f
107	contact@agiletechsolutions.co.uk	$2b$10$dAqqfhj68Qclw/EMgurg0urMtE10e86h0I33C53sVPQasJ64EFuo.	Bob	f	/objects/uploads/30ae13bc-5a25-49c7-a0f1-5ac89c505f32	2026-03-31 16:05:03.718035	bobcat19	\N	Im the best	\N	f	cus_UFa6kC5lENVibk	2026-03-31 17:09:31.248	t	\N	2026-03-31 16:40:24.902	525	0	\N	player	BOBX0107	\N	f	Catching,Dodging	\N	t	f	f
\.


--
-- Data for Name: videos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.videos (id, title, description, url, thumbnail_url, is_published, published_at, created_at) FROM stdin;
3	B DAY	\N	https://streamable.com/l/rpmg80/mp4.mp4	\N	t	2026-03-27 02:33:56.056	2026-03-27 02:33:09.063626
2	Dodge Club Rules	\N	https://streamable.com/l/azhfib/mp4-high.mp4	\N	t	2026-03-27 02:11:13.772	2026-03-27 02:10:07.207856
\.


--
-- Name: announcements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.announcements_id_seq', 1, false);


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attendance_id_seq', 83, true);


--
-- Name: awards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.awards_id_seq', 115, true);


--
-- Name: discount_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.discount_codes_id_seq', 1, false);


--
-- Name: event_registrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.event_registrations_id_seq', 1, false);


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.events_id_seq', 48, true);


--
-- Name: merch_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.merch_id_seq', 36, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 6, true);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 1, true);


--
-- Name: post_comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.post_comments_id_seq', 3, true);


--
-- Name: post_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.post_reports_id_seq', 1, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.posts_id_seq', 33, true);


--
-- Name: streak_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.streak_notifications_id_seq', 1, false);


--
-- Name: team_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.team_history_id_seq', 1, true);


--
-- Name: ticket_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ticket_types_id_seq', 21, true);


--
-- Name: tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tickets_id_seq', 62, true);


--
-- Name: user_blocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_blocks_id_seq', 1, false);


--
-- Name: user_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_reports_id_seq', 1, false);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_sessions_id_seq', 1428, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 107, true);


--
-- Name: videos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.videos_id_seq', 3, true);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: awards awards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_pkey PRIMARY KEY (id);


--
-- Name: discount_codes discount_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_code_key UNIQUE (code);


--
-- Name: discount_codes discount_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_pkey PRIMARY KEY (id);


--
-- Name: event_registrations event_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_pkey PRIMARY KEY (id);


--
-- Name: event_registrations event_registrations_user_id_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_user_id_event_id_key UNIQUE (user_id, event_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: merch merch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merch
    ADD CONSTRAINT merch_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_email_unique UNIQUE (email);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: post_comments post_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_pkey PRIMARY KEY (id);


--
-- Name: post_reports post_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reports
    ADD CONSTRAINT post_reports_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: streak_notifications streak_notifications_event_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streak_notifications
    ADD CONSTRAINT streak_notifications_event_id_user_id_key UNIQUE (event_id, user_id);


--
-- Name: streak_notifications streak_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streak_notifications
    ADD CONSTRAINT streak_notifications_pkey PRIMARY KEY (id);


--
-- Name: team_history team_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_history
    ADD CONSTRAINT team_history_pkey PRIMARY KEY (id);


--
-- Name: ticket_types ticket_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_types
    ADD CONSTRAINT ticket_types_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_ticket_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_code_key UNIQUE (ticket_code);


--
-- Name: user_blocks user_blocks_blocker_blocked_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocker_blocked_unique UNIQUE (blocker_id, blocked_id);


--
-- Name: user_blocks user_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_pkey PRIMARY KEY (id);


--
-- Name: user_reports user_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_pkey PRIMARY KEY (id);


--
-- Name: user_reports user_reports_reporter_reported_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_reporter_reported_unique UNIQUE (reported_by_user_id, reported_user_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_google_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_unique UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: videos videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (id);


--
-- Name: idx_prt_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prt_email ON public.password_reset_tokens USING btree (email);


--
-- Name: post_reports_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX post_reports_unique_idx ON public.post_reports USING btree (post_id, reported_by_user_id);


--
-- Name: tickets_checkout_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tickets_checkout_session_idx ON public.tickets USING btree (stripe_checkout_session_id);


--
-- Name: tickets_event_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tickets_event_id_idx ON public.tickets USING btree (event_id);


--
-- Name: tickets_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tickets_user_id_idx ON public.tickets USING btree (user_id);


--
-- Name: user_sessions_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_started_at_idx ON public.user_sessions USING btree (started_at);


--
-- Name: user_sessions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_user_id_idx ON public.user_sessions USING btree (user_id);


--
-- Name: attendance attendance_event_id_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_event_id_events_id_fk FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: awards awards_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: discount_codes discount_codes_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_registrations event_registrations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_registrations event_registrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: post_comments post_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_comments post_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: post_reports post_reports_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reports
    ADD CONSTRAINT post_reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_reports post_reports_reported_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reports
    ADD CONSTRAINT post_reports_reported_by_user_id_fkey FOREIGN KEY (reported_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: posts posts_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: streak_notifications streak_notifications_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streak_notifications
    ADD CONSTRAINT streak_notifications_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: streak_notifications streak_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streak_notifications
    ADD CONSTRAINT streak_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_history team_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_history
    ADD CONSTRAINT team_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ticket_types ticket_types_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_types
    ADD CONSTRAINT ticket_types_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_discount_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_discount_code_id_fkey FOREIGN KEY (discount_code_id) REFERENCES public.discount_codes(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_ticket_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES public.ticket_types(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_blocks user_blocks_blocked_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_blocks user_blocks_blocker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_reports user_reports_reported_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_reported_by_user_id_fkey FOREIGN KEY (reported_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_reports user_reports_reported_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict PxQbQDwniZFJjQLfPhdXQdeZbkkQNHEiZsyJAV8KhjyW8dqtkxFeBrdq51MMrFm

