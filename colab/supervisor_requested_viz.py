"""
Visualization requested by supervisor:
"Show results from first 5 simulations, then first 10, then first 15...
to show proof of what was done - proof of concept"
"""

import json
import matplotlib.pyplot as plt
import pandas as pd

# Load data
with open('training_results.json') as f:
    training = json.load(f)

baseline_delay = 42.71

# Checkpoints as requested: 5, 10, 15, 20, 30, 50
checkpoints = [5, 10, 15, 20, 30, 50]

print("="*70)
print("PROGRESSIVE LEARNING PROOF OF CONCEPT")
print("Georgetown Traffic AI - DQN Agent Training")
print("="*70)
print(f"\nBaseline (Fixed-Timing): {baseline_delay} seconds average delay\n")

# Create the visualization
fig, axes = plt.subplots(2, 3, figsize=(18, 10))
fig.suptitle('DQN Agent Learning Progress — Proof of Concept\nGeorgetown Traffic Simulation',
             fontsize=14, fontweight='bold')

axes = axes.flatten()

for idx, checkpoint in enumerate(checkpoints):
    # Get data up to this checkpoint
    episodes_so_far = training[:checkpoint]
    episodes = [m['episode'] for m in episodes_so_far]
    delays = [m['average_delay'] for m in episodes_so_far]
    
    final_delay = delays[-1]
    improvement = ((baseline_delay - final_delay) / baseline_delay) * 100
    
    # Print progress
    print(f"After {checkpoint:2d} episodes: {final_delay:.2f}s delay | {improvement:.1f}% improvement")
    
    # Plot
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
print("\n✅ Saved: progressive_learning.png")

# Create summary table
summary = []
for checkpoint in checkpoints:
    episode_data = training[checkpoint-1]
    delay = episode_data['average_delay']
    improvement = ((baseline_delay - delay) / baseline_delay) * 100
    reduction = baseline_delay - delay
    
    summary.append({
        'Episodes': checkpoint,
        'Avg Delay (s)': f"{delay:.2f}",
        'Improvement (%)': f"{improvement:.1f}%",
        'Delay Reduction (s)': f"{reduction:.2f}"
    })

df = pd.DataFrame(summary)

print("\n" + "="*70)
print("SUMMARY TABLE - PROOF OF PROGRESSIVE LEARNING")
print("="*70)
print(df.to_string(index=False))
print("="*70)

# Save to CSV
df.to_csv('progressive_summary.csv', index=False)
print("\n✅ Saved: progressive_summary.csv")

print("\n" + "="*70)
print("CONCLUSION:")
print(f"The agent learned progressively over 50 episodes,")
print(f"achieving a final improvement of {((baseline_delay - training[49]['average_delay']) / baseline_delay) * 100:.1f}%")
print(f"This demonstrates clear proof of concept for DQN-based traffic control.")
print("="*70)
