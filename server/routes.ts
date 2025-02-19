import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertArticleSchema, insertChannelSchema, insertCommentSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Channels
  app.post("/api/channels", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const channelData = insertChannelSchema.parse(req.body);
    const channel = await storage.createChannel({
      ...channelData,
      userId: req.user.id,
    });
    res.json(channel);
  });

  app.get("/api/channels", async (req, res) => {
    const channels = await storage.listChannels();
    res.json(channels);
  });

  app.get("/api/channels/:id", async (req, res) => {
    const channel = await storage.getChannel(parseInt(req.params.id));
    if (!channel) return res.sendStatus(404);
    res.json(channel);
  });

  // Articles
  app.post("/api/articles", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const articleData = insertArticleSchema.parse(req.body);
    const article = await storage.createArticle({
      ...articleData,
      userId: req.user.id,
    });
    res.json(article);
  });

  app.get("/api/articles", async (req, res) => {
    const articles = await storage.listArticles();
    res.json(articles);
  });

  app.get("/api/articles/:id", async (req, res) => {
    const article = await storage.getArticle(parseInt(req.params.id));
    if (!article) return res.sendStatus(404);
    res.json(article);
  });

  app.patch("/api/articles/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const article = await storage.getArticle(parseInt(req.params.id));
    if (!article) return res.sendStatus(404);
    if (article.userId !== req.user.id) return res.sendStatus(403);
    const updatedArticle = await storage.updateArticle(
      parseInt(req.params.id),
      req.body
    );
    res.json(updatedArticle);
  });

  // Comments
  app.post("/api/articles/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const commentData = insertCommentSchema.parse(req.body);
    const comment = await storage.createComment({
      ...commentData,
      articleId: parseInt(req.params.id),
      userId: req.user.id,
    });
    res.json(comment);
  });

  app.get("/api/articles/:id/comments", async (req, res) => {
    const comments = await storage.listComments(parseInt(req.params.id));
    res.json(comments);
  });

  // Reactions
  app.post("/api/articles/:id/reactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const reaction = await storage.createReaction({
      articleId: parseInt(req.params.id),
      userId: req.user.id,
      isLike: req.body.isLike,
    });
    res.json(reaction);
  });

  // Subscriptions
  app.post("/api/channels/:id/subscribe", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const subscription = await storage.createSubscription({
      channelId: parseInt(req.params.id),
      userId: req.user.id,
    });
    res.json(subscription);
  });

  app.delete("/api/channels/:id/subscribe", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteSubscription(
      parseInt(req.params.id),
      req.user.id
    );
    res.sendStatus(200);
  });

  const httpServer = createServer(app);
  return httpServer;
}
