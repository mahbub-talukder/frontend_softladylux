<script setup lang="ts">
// Design: Art board. Garment line drawings used where a photo is missing (tinted tile + art).
// Strokes follow `currentColor`; paths are the canvas's own.
defineProps<{ kind: string }>()
</script>

<template>
  <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" class="block h-auto w-full" aria-hidden="true">
    <g v-if="kind === 'bra'">
      <path vector-effect="non-scaling-stroke" d="M62 18C60 48 56 68 52 88" /><path vector-effect="non-scaling-stroke" d="M138 18C140 48 144 68 148 88" />
      <path vector-effect="non-scaling-stroke" d="M50 90C70 78 90 84 100 102C110 84 130 78 150 90" /><path vector-effect="non-scaling-stroke" d="M50 90C50 126 82 146 100 122C118 146 150 126 150 90" />
      <path vector-effect="non-scaling-stroke" d="M50 92C32 104 28 130 34 152C70 168 130 168 166 152C172 130 168 104 150 92" />
    </g>
    <g v-else-if="kind === 'brief'">
      <path vector-effect="non-scaling-stroke" d="M28 66H172C168 108 138 150 100 178C62 150 32 108 28 66Z" /><path vector-effect="non-scaling-stroke" d="M30 78H170" />
      <path vector-effect="non-scaling-stroke" d="M44 112C70 124 84 140 100 160" /><path vector-effect="non-scaling-stroke" d="M156 112C130 124 116 140 100 160" />
    </g>
    <g v-else-if="kind === 'set'">
      <g transform="translate(36 2) scale(0.64)">
        <path vector-effect="non-scaling-stroke" d="M62 18C60 48 56 68 52 88" /><path vector-effect="non-scaling-stroke" d="M138 18C140 48 144 68 148 88" />
        <path vector-effect="non-scaling-stroke" d="M50 90C70 78 90 84 100 102C110 84 130 78 150 90" /><path vector-effect="non-scaling-stroke" d="M50 90C50 126 82 146 100 122C118 146 150 126 150 90" />
        <path vector-effect="non-scaling-stroke" d="M50 92C32 104 28 130 34 152C70 168 130 168 166 152C172 130 168 104 150 92" />
      </g>
      <g transform="translate(36 104) scale(0.64)"><path vector-effect="non-scaling-stroke" d="M28 66H172C168 108 138 150 100 178C62 150 32 108 28 66Z" /><path vector-effect="non-scaling-stroke" d="M30 78H170" /></g>
    </g>
    <g v-else-if="kind === 'shape'">
      <path vector-effect="non-scaling-stroke" d="M70 14C70 40 66 60 60 80C52 100 56 130 66 150L80 186H120L134 150C144 130 148 100 140 80C134 60 130 40 130 14" />
      <path vector-effect="non-scaling-stroke" d="M70 14C85 40 115 40 130 14" /><path vector-effect="non-scaling-stroke" d="M58 104C88 114 112 114 142 104" /><path vector-effect="non-scaling-stroke" d="M100 186V150" />
    </g>
    <g v-else-if="kind === 'gown'">
      <path vector-effect="non-scaling-stroke" d="M78 16L66 46L46 186H154L134 46L122 16" /><path vector-effect="non-scaling-stroke" d="M78 16C90 54 110 54 122 16" /><path vector-effect="non-scaling-stroke" d="M66 46C88 64 112 64 134 46" />
    </g>
    <g v-else-if="kind === 'gift'">
      <path vector-effect="non-scaling-stroke" d="M40 90H160V172H40Z" /><path vector-effect="non-scaling-stroke" d="M32 66H168V90H32Z" /><path vector-effect="non-scaling-stroke" d="M100 66V172" />
      <path vector-effect="non-scaling-stroke" d="M100 66C80 36 60 50 78 66" /><path vector-effect="non-scaling-stroke" d="M100 66C120 36 140 50 122 66" />
    </g>
    <g v-else-if="kind === 'acc'">
      <ellipse vector-effect="non-scaling-stroke" cx="100" cy="100" rx="62" ry="32" transform="rotate(-18 100 100)" /><ellipse vector-effect="non-scaling-stroke" cx="100" cy="100" rx="36" ry="14" transform="rotate(-18 100 100)" />
      <path vector-effect="non-scaling-stroke" d="M52 128C70 140 90 142 108 132" />
    </g>
    <g v-else>
      <path vector-effect="non-scaling-stroke" d="M70 14C68 40 66 56 62 70L56 186H144L138 70C134 56 132 40 130 14" /><path vector-effect="non-scaling-stroke" d="M70 14C80 54 120 54 130 14" /><path vector-effect="non-scaling-stroke" d="M58 168C80 176 120 176 142 168" />
    </g>
  </svg>
</template>
