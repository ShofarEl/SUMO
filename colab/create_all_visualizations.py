"""
Master script to create all proof-of-concept visualizations
Run this in Google Colab to generate all charts for your thesis defense
"""

import json
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

print("="*70)
print("CREATING ALL PROOF-OF-CONCEPT VISUALIZATIONS")
print("Georgetown Traffic AI - DQN Agent Training")
print("="*70)

# Load data
with open('training_results.json') as f:
    training = json.load(f)

baseline_delay = 42.71
checkpoints = [5, 10, 15, 20, 30, 50]

# ============================================================
# VISUALIZATION 1: Main Progressive Learning (6 panels)
# ============================================================
print("\n[1/3] Creating main progressive learning visualization...")

fig, axes = plt.subplots(2, 3, figsize=(18, 10))
fig.suptitle('DQN Agent Learning Progress — Proof of Concept\nGeorgetown Traffic Simulation',
             fontsize=14, fontweight='bold')

axes = axes.flatten()

for idx, checkpoint in enumerate(checkpoints):
    episodes_so_far = training[:checkpoint]
    episodes = [m['episode'] for m in episodes_so_far]
    delays = [m['average_delay'] for m in episodes_so_far]
    
    final_delay = delays[-1]
    improvement = ((baseline_delay - final_delay) / baseline_delay) * 100
    
    axes[idx].plot(episodes, delays, 'b-o', linewidth=2, markersize=5)
    axes[idx].axhline(y=baseline_delay, color='r', linestyle='--',
                     linewidth=2, label=f'Baseline: {baseline_delay}s')
    axes[idx].fill_between(episodes, delays, baseline_delay,
                          alpha=0.15, color='green')
    
    axes[idx].set_xlabel('Episode')
    axes[idx].set_ylabel('Average Delay (seconds)')
    axes[idx].set_title(f'After {checkpoint} Episodes\nDelay: {final_delay:.2f}s  |  Improvement: {improvement:.1f}%',
                       fontweight='bold')
    axes[idx].legend(fontsize=9)
    axes[idx].grid(True, alpha=0.3)
    axes[idx].set_ylim(20, 50)

plt.tight_layout()
plt.savefig('progressive_learning.png', dpi=150, bbox_inches='tight')
print("   ✅ Saved: progressive_learning.png")

# ============================================================
# VISUALIZATION 2: Side-by-side comparison bars
# ============================================================
print("\n[2/3] Creating checkpoint comparison bars...")

fig, ax = plt.subplots(figsize=(14, 8))

labels = ['Baseline'] + [f'After\n{cp} Eps' for cp in checkpoints]
delays_list = [baseline_delay] + [training[cp-1]['average_delay'] for cp in checkpoints]
colors = ['#e74c3c'] + ['#3498db', '#2ecc71', '#27ae60', '#16a085', '#1abc9c', '#0e6655']

bars = ax.bar(labels, delays_list, color=colors, alpha=0.8, edgecolor='black', linewidth=2)

# Add value labels on bars
for bar in bars:
    height = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2., height,
            f'{height:.2f}s',
            ha='center', va='bottom', fontweight='bold', fontsize=11)

# Add improvement percentages
for idx, cp in enumerate(checkpoints):
    delay = training[cp-1]['average_delay']
    improvement = ((baseline_delay - delay) / baseline_delay) * 100
    ax.text(idx+1, delay - 2, f'↓{improvement:.1f}%',
            ha='center', va='top', fontweight='bold', fontsize=10, color='white')

ax.set_ylabel('Average Delay (seconds)', fontweight='bold', fontsize=12)
ax.set_title('Progressive Performance Improvement\nProof of Concept: DQN Agent Learning',
            fontweight='bold', fontsize=14)
ax.grid(axis='y', alpha=0.3)
ax.set_ylim(0, 50)

plt.tight_layout()
plt.savefig('checkpoint_comparison.png', dpi=150, bbox_inches='tight')
print("   ✅ Saved: checkpoint_comparison.png")

# ============================================================
# VISUALIZATION 3: Learning curve with annotations
# ============================================================
print("\n[3/3] Creating annotated learning curve...")

fig, ax = plt.subplots(figsize=(14, 8))

episodes = [e['episode'] for e in training]
delays = [e['average_delay'] for e in training]

# Plot main curve
ax.plot(episodes, delays, 'b-', linewidth=3, label='DQN Agent Performance')
ax.axhline(y=baseline_delay, color='r', linestyle='--', linewidth=2, label='Baseline (Fixed-Timing)')
ax.fill_between(episodes, delays, baseline_delay, alpha=0.2, color='green')

# Add checkpoint markers and annotations
for cp in checkpoints:
    delay = training[cp-1]['average_delay']
    improvement = ((baseline_delay - delay) / baseline_delay) * 100
    
    ax.plot(cp, delay, 'ro', markersize=12, markeredgecolor='black', markeredgewidth=2)
    ax.annotate(f'Ep {cp}\n{delay:.2f}s\n({improvement:.1f}%)',
               xy=(cp, delay), xytext=(cp, delay-5),
               ha='center', fontsize=9, fontweight='bold',
               bbox=dict(boxstyle='round,pad=0.5', facecolor='yellow', alpha=0.7),
               arrowprops=dict(arrowstyle='->', connectionstyle='arc3,rad=0', lw=2))

ax.set_xlabel('Episode', fontweight='bold', fontsize=12)
ax.set_ylabel('Average Delay (seconds)', fontweight='bold', fontsize=12)
ax.set_title('Complete Learning Trajectory with Key Checkpoints\nProof of Progressive Optimization',
            fontweight='bold', fontsize=14)
ax.legend(fontsize=11, loc='upper right')
ax.grid(True, alpha=0.3)
ax.set_ylim(20, 50)

plt.tight_layout()
plt.savefig('learning_curve_annotated.png', dpi=150, bbox_inches='tight')
print("   ✅ Saved: learning_curve_annotated.png")

# ============================================================
# CREATE SUMMARY TABLE
# ============================================================
print("\n" + "="*70)
print("PROGRESSIVE LEARNING SUMMARY")
print("="*70)

summary_data = []
for cp in checkpoints:
    delay = training[cp-1]['average_delay']
    improvement = ((baseline_delay - delay) / baseline_delay) * 100
    reduction = baseline_delay - delay
    
    summary_data.append({
        'Checkpoint': f'After {cp} Episodes',
        'Avg Delay (s)': f"{delay:.2f}",
        'Improvement (%)': f"{improvement:.1f}",
        'Delay Reduction (s)': f"{reduction:.2f}"
    })

df = pd.DataFrame(summary_data)
print(f"\nBaseline: {baseline_delay} seconds\n")
print(df.to_string(index=False))

df.to_csv('progressive_summary.csv', index=False)
print("\n✅ Saved: progressive_summary.csv")

print("\n" + "="*70)
print("ALL VISUALIZATIONS CREATED SUCCESSFULLY!")
print("="*70)
print("\nFiles created:")
print("  1. progressive_learning.png - 6-panel progressive view")
print("  2. checkpoint_comparison.png - Bar chart comparison")
print("  3. learning_curve_annotated.png - Annotated learning curve")
print("  4. progressive_summary.csv - Data table")
print("\nThese visualizations provide clear proof of concept for your thesis defense.")
print("="*70)
