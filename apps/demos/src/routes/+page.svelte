<script lang="ts">
  const demos = [
    {
      href: '/themes/default',
      title: 'Default',
      description: 'Full chrome and node palette — the standard FlowDrop feel.',
      image: '/screenshots/default.png'
    },
    {
      href: '/themes/minimal',
      title: 'Minimal',
      description: 'Quieter chrome for embedding inside an existing UI.',
      image: '/screenshots/minimal.png'
    },
    {
      href: '/themes/drafter',
      title: 'Drafter',
      description: 'A sketch-like, low-fidelity whiteboard skin.',
      image: '/screenshots/drafter.png'
    }
  ];
</script>

<svelte:head>
  <title>FlowDrop Themes</title>
</svelte:head>

<div class="page">
  <h1>FlowDrop Themes</h1>

  <section class="grid">
    {#each demos as demo (demo.href)}
      <a class="card" href={demo.href}>
        <span class="thumb">
          <!-- Until a screenshot is dropped into static/screenshots/, hide the
               broken-image glyph and let the neutral placeholder stand in. -->
          <img
            src={demo.image}
            alt={`${demo.title} theme preview`}
            loading="lazy"
            onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
          />
        </span>
        <div class="body">
          <h2>{demo.title}</h2>
          <p>{demo.description}</p>
          <span class="cta">Launch Demo →</span>
        </div>
      </a>
    {/each}
  </section>
</div>

<style>
  .page {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 48px 24px 32px;
    max-width: 1040px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }

  h1 {
    font-size: 28px;
    margin: 0 0 28px;
    letter-spacing: -0.02em;
  }

  /* 3-column grid — one row of three themes. */
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  @media (max-width: 880px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 600px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  .card {
    display: flex;
    flex-direction: column;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    background: #fff;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      transform 0.15s ease;
  }
  .card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 10px 28px -16px rgba(15, 23, 42, 0.35);
    transform: translateY(-2px);
  }

  .thumb {
    display: block;
    aspect-ratio: 16 / 10;
    background: #f1f5f9;
    border-bottom: 1px solid #eef2f7;
    overflow: hidden;
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .body {
    padding: 16px 18px 18px;
  }
  .card h2 {
    font-size: 16px;
    margin: 0 0 4px;
  }
  .card p {
    font-size: 13px;
    line-height: 1.45;
    color: #64748b;
    margin: 0 0 12px;
  }
  .cta {
    font-size: 14px;
    font-weight: 600;
    color: #475569;
  }
</style>
