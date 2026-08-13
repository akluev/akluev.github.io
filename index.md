---
layout: default
description: Alex on APEX is Alexander Kluev's technical blog about Oracle APEX, SQL, PL/SQL, SQLcl, Git, CI/CD, generative AI, and practical software development.
---

<section class="hero">
  <p class="eyebrow">Oracle &amp; APEX developer</p>
  <picture>
    <source srcset="{{ '/assets/images/home/alex-on-apex-logo.webp' | relative_url }}" type="image/webp">
    <img class="brand-logo brand-logo-home" src="{{ '/assets/images/home/alex-on-apex-logo.png' | relative_url }}" alt="Alex on APEX" width="1200" height="599">
  </picture>
  <h1>Building useful software,<br>one clear solution at a time.</h1>
  <p class="lede">I'm Alexander Kluev. I write about Oracle APEX, SQL, PL/SQL, SQLcl, Git, CI/CD, generative AI, and whatever useful technology comes next.</p>
  <div class="hero-note">
    <p>Good technical notes begin with a real problem. They explain what mattered, what did not, and why the final solution worked.</p>
    <p>That is the aim of this blog: concise articles, useful examples, and practical lessons that can be applied to real work.</p>
  </div>
  <p class="hero-actions"><a class="button" href="{{ '/blog/' | relative_url }}">Read the blog</a> <a class="text-link" href="{{ '/about/' | relative_url }}">About me &rarr;</a></p>
</section>

<section class="latest-posts" aria-labelledby="latest-heading">
  <div class="section-heading">
    <h2 id="latest-heading">Latest writing</h2>
    <a href="{{ '/blog/' | relative_url }}">View all</a>
  </div>

  {% if site.posts.size > 0 %}
  <ul class="post-list">
    {% for post in site.posts limit:3 %}
    <li>
      <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%b %-d, %Y" }}</time>
      <h3><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a></h3>
      {% if post.description %}<p>{{ post.description | escape }}</p>{% endif %}
    </li>
    {% endfor %}
  </ul>
  {% else %}
  <p>New articles are on the way.</p>
  {% endif %}
</section>
