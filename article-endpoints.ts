// Article update endpoint
app.patch("/api/articles/:id", async (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    console.log(`Updating article ${articleId}`);
    
    // Extract the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("No Authorization header found for article update");
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token with Supabase
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error('Error verifying user token for article update:', userError);
      return res.status(401).json({ error: 'Invalid authentication' });
    }
    
    // Look up the user in the database
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', userData.user.id)
      .single();
    
    if (dbError || !dbUser) {
      console.error('Error finding user for article update:', dbError);
      return res.status(401).json({ error: 'User not found' });
    }
    
    const userId = dbUser.id;
    
    // Check if article exists and belongs to this user
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();
      
    if (articleError) {
      console.error(`Article ${articleId} not found:`, articleError);
      return res.status(404).json({ error: 'Article not found' });
    }
    
    if (article.user_id !== userId) {
      console.error(`User ${userId} not authorized to update article ${articleId}`);
      return res.status(403).json({ error: 'Not authorized to update this article' });
    }
    
    // Extract update fields from request
    const { title, content, summary, published, location, category } = req.body;
    
    // Create update object with only fields that are provided
    const updateObj: any = { last_edited: new Date().toISOString() };
    
    if (title !== undefined) updateObj.title = title;
    if (content !== undefined) updateObj.content = content;
    if (summary !== undefined) updateObj.summary = summary;
    if (published !== undefined) updateObj.published = published;
    if (location !== undefined) updateObj.location = location;
    if (category !== undefined) updateObj.category = category;
    
    // Update the article
    const { data: updatedArticle, error: updateError } = await supabase
      .from('articles')
      .update(updateObj)
      .eq('id', articleId)
      .select()
      .single();
      
    if (updateError) {
      console.error(`Error updating article ${articleId}:`, updateError);
      return res.status(500).json({ error: 'Failed to update article' });
    }
    
    console.log(`Article ${articleId} updated successfully`);
    return res.json(updatedArticle);
  } catch (error) {
    console.error('Error in article update endpoint:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Toggle article publish status 
app.post("/api/articles/:id/toggle-status", async (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    console.log(`Toggling publish status for article ${articleId}`);
    
    // Extract the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("No Authorization header found for toggle status");
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token with Supabase
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error('Error verifying user token for toggle status:', userError);
      return res.status(401).json({ error: 'Invalid authentication' });
    }
    
    // Look up the user in the database
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_uid', userData.user.id)
      .single();
    
    if (dbError || !dbUser) {
      console.error('Error finding user for toggle status:', dbError);
      return res.status(401).json({ error: 'User not found' });
    }
    
    const userId = dbUser.id;
    
    // Check if article exists and belongs to this user
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();
      
    if (articleError) {
      console.error(`Article ${articleId} not found:`, articleError);
      return res.status(404).json({ error: 'Article not found' });
    }
    
    if (article.user_id !== userId) {
      console.error(`User ${userId} not authorized to toggle article ${articleId}`);
      return res.status(403).json({ error: 'Not authorized to toggle this article' });
    }
    
    // Toggle the published status
    const { data: updatedArticle, error: updateError } = await supabase
      .from('articles')
      .update({ 
        published: !article.published,
        last_edited: new Date().toISOString()
      })
      .eq('id', articleId)
      .select()
      .single();
      
    if (updateError) {
      console.error(`Error toggling article ${articleId}:`, updateError);
      return res.status(500).json({ error: 'Failed to toggle article status' });
    }
    
    console.log(`Article ${articleId} toggled to ${updatedArticle.published ? 'published' : 'draft'}`);
    return res.json(updatedArticle);
  } catch (error) {
    console.error('Error in toggle article status endpoint:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}); 