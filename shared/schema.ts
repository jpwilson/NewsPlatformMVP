import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sqliteTable } from 'drizzle-orm/sqlite-core';
import { relations } from "drizzle-orm";

// Define tables using pgTable for PostgreSQL compatibility, but ensure snake_case for both SQLite and PostgreSQL
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull()
});

export const channels = sqliteTable('channels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  userId: integer('userId').notNull(),  // camelCase, not snake_case
  category: text('category'),
  location: text('location'),
  bannerImage: text('bannerImage'),
  profileImage: text('profileImage')
});

export const articles = sqliteTable('articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  channelId: integer('channelId').notNull(),  // camelCase, not snake_case
  userId: integer('userId').notNull(),  // camelCase, not snake_case
  category: text('category').notNull(),
  location: text('location'),
  published: integer('published', { mode: 'boolean' }).notNull().default(1),
  createdAt: text('createdAt').notNull().default('CURRENT_TIMESTAMP'),
});

export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  articleId: integer('articleId').notNull(),  // camelCase, not snake_case
  userId: integer('userId').notNull(),  // camelCase, not snake_case
  parentId: integer('parentId'),  // camelCase, not snake_case
  createdAt: timestamp('createdAt').defaultNow()  // camelCase, not snake_case
});

export const reactions = sqliteTable('reactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  articleId: integer('articleId').notNull(),  // camelCase, not snake_case
  userId: integer('userId').notNull(),  // camelCase, not snake_case
  isLike: boolean('isLike').notNull()
});

export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  channelId: integer('channelId').notNull(),  // camelCase, not snake_case 
  userId: integer('userId').notNull()  // camelCase, not snake_case
});

export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  userId: integer('userId').notNull(),  // camelCase, not snake_case
  articleId: integer('articleId'),  // camelCase, not snake_case
  channelId: integer('channelId')  // camelCase, not snake_case
});

export const insertUserSchema = createInsertSchema(users);
export const insertChannelSchema = createInsertSchema(channels).extend({
  name: z.string().min(1, "Channel name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().optional(),
  location: z.string().optional(),
  banner_image: z.string().optional(),
  profile_image: z.string().optional(),
});
export const insertArticleSchema = createInsertSchema(articles).omit({ 
  createdAt: true 
});
export const insertCommentSchema = createInsertSchema(comments).omit({ 
  createdAt: true 
});
export const insertReactionSchema = createInsertSchema(reactions);
export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const insertNoteSchema = createInsertSchema(notes);

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