#!/bin/bash
cd "$(dirname "$0")"
echo "=========================================="
echo "🎬 Työnnetään Katselulista GitHubiin..."
echo "=========================================="
git push -u origin main
echo ""
echo "Valmis! Voit nyt sulkea tämän ikkunan."
