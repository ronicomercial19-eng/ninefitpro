# Architecture rules

- Keep Hub rhythm aggregation and SVG geometry in pure helpers, separate from persistence; this lets seven-day charts update from canonical entries without changing save, identity or authorization contracts.