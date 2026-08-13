---
layout: default
title: Blog
permalink: /blog/
description: Alex on APEX articles about Oracle APEX, SQL, PL/SQL, SQLcl, Git, CI/CD, generative AI, and practical software development.
---

<section class="page blog-index">
  <p class="eyebrow">Oracle &amp; APEX developer</p>
  <h1 class="brand-heading">
    <picture>
      <source srcset="{{ '/assets/images/home/alex-on-apex-logo-alt.webp' | relative_url }}" type="image/webp">
      <img class="brand-logo brand-logo-blog" src="{{ '/assets/images/home/alex-on-apex-logo-alt.png' | relative_url }}" alt="Alex on APEX" width="1200" height="599">
    </picture>
  </h1>
  <p class="lede blog-intro">Whenever I run into something interesting, I try to turn it into an article here. Please take a look.</p>

  {% if site.posts.size > 0 %}
  <ul class="post-list post-list-full">
    {% for post in site.posts %}
    <li>
      <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%B %-d, %Y" }}</time>
      <h2><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a></h2>
      {% if post.description %}<p>{{ post.description | escape }}</p>{% endif %}
    </li>
    {% endfor %}
  </ul>
  {% else %}
  <p>No posts yet. Check back soon.</p>
  {% endif %}
</section>
