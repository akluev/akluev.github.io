---
layout: default
description: Alexander Kluev is an Oracle and APEX developer writing about databases and practical software development.
---

<section class="hero">
  <p class="eyebrow">Oracle &amp; APEX developer</p>
  <h1>Building useful software,<br>one clear solution at a time.</h1>
  <p class="lede">I'm Alexander Kluev. I work with Oracle Database, APEX, SQL, and PL/SQL, and write about the lessons worth keeping.</p>
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
