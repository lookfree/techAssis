#!/bin/bash

# Fix imports script to convert @/ to relative imports

# For files in /src/contexts/ 
find /Users/Administrator/Documents/work/dev/techAssis/frontend-teacher/src/contexts -name "*.tsx" -o -name "*.ts" | while read file; do
  echo "Processing contexts file: $file"
  sed -i '' "s|from '@/services/|from '../services/|g" "$file"
  sed -i '' "s|from '@/types|from '../types|g" "$file"
  sed -i '' "s|from '@/store|from '../store|g" "$file"
  sed -i '' "s|from '@/contexts/|from './|g" "$file"
  sed -i '' "s|from '@/components/|from '../components/|g" "$file"
  sed -i '' "s|from '@/pages/|from '../pages/|g" "$file"
done

# For files in /src/components/ (need to go up two levels for some)
find /Users/Administrator/Documents/work/dev/techAssis/frontend-teacher/src/components -name "*.tsx" -o -name "*.ts" | while read file; do
  echo "Processing components file: $file"
  sed -i '' "s|from '@/services/|from '../../services/|g" "$file"
  sed -i '' "s|from '@/types|from '../../types|g" "$file"
  sed -i '' "s|from '@/store|from '../../store|g" "$file"
  sed -i '' "s|from '@/contexts/|from '../../contexts/|g" "$file"
  sed -i '' "s|from '@/components/|from '../|g" "$file"
  sed -i '' "s|from '@/pages/|from '../../pages/|g" "$file"
done

# For files in /src/pages/
find /Users/Administrator/Documents/work/dev/techAssis/frontend-teacher/src/pages -name "*.tsx" -o -name "*.ts" | while read file; do
  echo "Processing pages file: $file"
  sed -i '' "s|from '@/services/|from '../services/|g" "$file"
  sed -i '' "s|from '@/types|from '../types|g" "$file"
  sed -i '' "s|from '@/store|from '../store|g" "$file"
  sed -i '' "s|from '@/contexts/|from '../contexts/|g" "$file"
  sed -i '' "s|from '@/components/|from '../components/|g" "$file"
  sed -i '' "s|from '@/pages/|from './|g" "$file"
done

# For files in /src/store/ and subdirectories
find /Users/Administrator/Documents/work/dev/techAssis/frontend-teacher/src/store -name "*.tsx" -o -name "*.ts" | while read file; do
  echo "Processing store file: $file"
  # Check if it's in a subdirectory of store
  if [[ "$file" == */slices/* ]]; then
    sed -i '' "s|from '@/services/|from '../../services/|g" "$file"
    sed -i '' "s|from '@/types|from '../../types|g" "$file"
    sed -i '' "s|from '@/store|from '../|g" "$file"
    sed -i '' "s|from '@/contexts/|from '../../contexts/|g" "$file"
    sed -i '' "s|from '@/components/|from '../../components/|g" "$file"
    sed -i '' "s|from '@/pages/|from '../../pages/|g" "$file"
  else
    sed -i '' "s|from '@/services/|from '../services/|g" "$file"
    sed -i '' "s|from '@/types|from '../types|g" "$file"
    sed -i '' "s|from '@/store|from './|g" "$file"
    sed -i '' "s|from '@/contexts/|from '../contexts/|g" "$file"
    sed -i '' "s|from '@/components/|from '../components/|g" "$file"
    sed -i '' "s|from '@/pages/|from '../pages/|g" "$file"
  fi
done

echo "Import fixing complete!"