# FlowDrop + Drupal

[Drupal](https://www.drupal.org/) is a powerful open-source CMS that pairs naturally with FlowDrop. The [FlowDrop Drupal module](https://www.drupal.org/project/flowdrop) provides a full backend integration out of the box — no custom API code needed.

## Quick Start

### 1. Install Drupal

Follow the [official installation guide](https://www.drupal.org/docs/getting-started/installing-drupal) or use Composer:

```bash
composer create-project drupal/recommended-project my-site
cd my-site
```

### 2. Install the FlowDrop Module

```bash
composer require drupal/flowdrop
drush en flowdrop
```

### 3. Done

The module ships with a built-in FlowDrop client and admin UI — no separate client setup needed:

- **Dashboard** — `/admin/flowdrop`
- **Workflow listing** — `/admin/flowdrop/workflows`

## Links

- [FlowDrop Drupal module](https://www.drupal.org/project/flowdrop)
- [Drupal documentation](https://www.drupal.org/docs)
- [Drupal installation guide](https://www.drupal.org/docs/getting-started/installing-drupal)
