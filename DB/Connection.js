app.delete('/blogs/:id', (req, res) => {
  Blog.findById(req.params.id, async function(err, blog) {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('back');
    }
    try {
      await cloudinary.v2.uploader.destroy(blog.imageId);
      blog.remove();
      req.flash('success', 'Campground deleted successfully!');
      res.redirect('/blogs');
    } catch (err) {
      if (err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
    }
  });
});
