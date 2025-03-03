import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Define tables using pgTable for PostgreSQL (Supabase)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  description: text('description'),
  supabase_uid: text('supabase_uid'),
  created_at: timestamp('created_at').defaultNow()
});

export const channels = pgTable('channels', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  userId: integer('user_id').notNull(),
  category: text('category'),
  location: text('location'),
  bannerImage: text('banner_image'),
  profileImage: text('profile_image')
});

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  channelId: integer('channel_id').notNull(),
  userId: integer('user_id').notNull(),
  category: text('category').notNull(),
  location: text('location'),
  published: boolean('published').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow()
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  articleId: integer('article_id').notNull(),
  userId: integer('user_id').notNull(),
  parentId: integer('parent_id'),
  createdAt: timestamp('created_at').defaultNow()
});

export const reactions = pgTable('reactions', {
  id: serial('id').primaryKey(),
  articleId: integer('article_id').notNull(),
  userId: integer('user_id').notNull(),
  isLike: boolean('is_like').notNull()
});

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  channelId: integer('channel_id').notNull(),
  userId: integer('user_id').notNull()
});

export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  userId: integer('user_id').notNull(),
  articleId: integer('article_id'),
  channelId: integer('channel_id')
});

// Define schema relations
export const usersRelations = relations(users, ({ many }) => ({
  channels: many(channels),
  articles: many(articles),
  comments: many(comments),
  reactions: many(reactions),
  subscriptions: many(subscriptions),
  notes: many(notes)
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
  user: one(users, {
    fields: [channels.userId],
    references: [users.id]
  }),
  articles: many(articles),
  subscriptions: many(subscriptions)
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  channel: one(channels, {
    fields: [articles.channelId],
    references: [channels.id]
  }),
  user: one(users, {
    fields: [articles.userId],
    references: [users.id]
  }),
  comments: many(comments),
  reactions: many(reactions)
}));

// Create Zod schemas from Drizzle schema
export const insertUserSchema = createInsertSchema(users);
export const insertChannelSchema = createInsertSchema(channels);
export const insertArticleSchema = createInsertSchema(articles).omit({ 
  createdAt: true 
});
export const insertCommentSchema = createInsertSchema(comments).omit({ 
  createdAt: true 
});
export const insertReactionSchema = createInsertSchema(reactions);
export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const insertNoteSchema = createInsertSchema(notes);

// Export types
export type User = typeof users.$inferSelect;
export type Channel = typeof channels.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Reaction = typeof reactions.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Note = typeof notes.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertReaction = z.infer<typeof insertReactionSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type InsertNote = z.infer<typeof insertNoteSchema>;