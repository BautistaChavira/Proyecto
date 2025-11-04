-- init.sql
-- Schema for Mascotas application
-- This file creates the tables required by:
--  - Catalogo (categories, breeds, breed_images)
--  - Curiosidades (curiosidades)
--  - MisMascotas (users, pets, pet_photos)

-- Tables are created with IF NOT EXISTS so the script can be re-run safely.

-- Users (for MisMascotas / authentication)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  recovery_attempts INTEGER DEFAULT 0,
  recovery_blocked_until TIMESTAMP WITH TIME ZONE
);

-- Categories for catalog (e.g., Perros, Gatos, Aves)
CREATE TABLE IF NOT EXISTS categories (
	id SERIAL PRIMARY KEY,
	name VARCHAR(150) UNIQUE NOT NULL,
	description TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Breeds belong to categories
CREATE TABLE IF NOT EXISTS breeds (
	id SERIAL PRIMARY KEY,
	category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
	name VARCHAR(200) NOT NULL,
	scientific_name VARCHAR(200),
	description TEXT,
	default_image_url TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	UNIQUE (category_id, name)
);

-- Optional extra images for breeds
CREATE TABLE IF NOT EXISTS breed_images (
	id SERIAL PRIMARY KEY,
	breed_id INTEGER REFERENCES breeds(id) ON DELETE CASCADE,
	image_url TEXT NOT NULL,
	caption TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Curiosidades (informational cards)
CREATE TABLE IF NOT EXISTS curiosidades (
	id SERIAL PRIMARY KEY,
	title VARCHAR(300) NOT NULL,
	content TEXT NOT NULL,
	image_url TEXT,
	tags TEXT[],
	visible BOOLEAN DEFAULT true,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User pets (MisMascotas)
CREATE TABLE IF NOT EXISTS pets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT NOT NULL,
  description TEXT DEFAULT ''
);

-- Photos for user pets
CREATE TABLE IF NOT EXISTS pet_photos (
	id SERIAL PRIMARY KEY,
	pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
	image_url TEXT NOT NULL,
	caption TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Simple index suggestions
CREATE INDEX IF NOT EXISTS idx_breeds_category ON breeds(category_id);
CREATE INDEX IF NOT EXISTS idx_pets_user ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_curiosidades_visible ON curiosidades(visible);

-- End of schema
