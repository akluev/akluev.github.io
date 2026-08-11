---
layout: default
title: Blog
permalink: /blog/
description: Technical articles by Alexander Kluev about Oracle, APEX, and software development.
---

<section class="page blog-index">
  <p class="eyebrow">Blog</p>
  <h1>Notes from the work.</h1>
  <p class="lede">Articles about Oracle, APEX, SQL, PL/SQL, and building software that lasts.</p>

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
