import json
import matplotlib.pyplot as plt
import pandas as pd

# Load training data
with open('training_results.json') as f:
    training = json.load(f)

baseline_delay = 42.71

# Checkpoints to show progressive learning
checkpoints = [5, 10, 15, 20, 30, 50]

# Create figure with 2x3 subplots
fig, axes = plt.subplots(2, 3, figsize=(18, 10))
fig.suptitle('DQN Agent Learning Progress — Proof of Concept\nGeorgetown Traffic Simulation',
             fontsize=16, fontweight='bold', y=0.995)

axes = axes.flatten()

# Store results for summary table
summary_data = []

for idx, checkpoint in enumerate(checkpoints):
    episodes_so_far = training[:checkpoint]
    episodes = [m['episode'] for m in episodes_so_far]
    delays = [m['average_delay'] for m in episodes_so_far]
    
    final_delay = delays[-1]
    improvement = ((baseline_delay - final_delay) / baseline_delay) * 100
    
    # Store for summary
    summary_data.append({
        'Episodes': checkpoint,
        'Final Delay (s)': final_delay,
        'Improvement (%)': improvement
    })
    
    # Plot
    axes[idx].plot(episodes, delays, 'b-o', linewidth=2, markersize=5, label='DQN Agent')
    axes[idx].axhline(y=baseline_delay, color='r', linestyle='--', 
                     linewidth=2, label=f'Baseline: {baseline_delay}s')
    axes[idx].fill_between(episodes, delays, baseline_delay, 
                          alpha=0.15, color='green')
    
    axes[idx].set_xlabel('Episode', fontsize=10, fontweight='bold')
    axes[idx].set_ylabel('Average Delay (seconds)', fontsize=10, fontweight='bold')
    axes[idx].set_title(f'After {checkpoint} Episodes\nDelay: {final_delay:.2f}s  |  Improvement: {improvement:.1f}%',
                       fontweight='bold', fontsize=11)
    axes[idx].legend(fontsize=9, loc='upper right')
    axes[idx].grid(True, alpha=0.3)
    axes[idx].set_ylim(20, 50)

plt.tight_layout()
plt.savefig('progressive_learning_enhanced.png', dpi=300, bbox_inches='tight')
print("✅ Saved: progressive_learning_enhanced.png")

# Create summary table
df = pd.DataFrame(summary_data)
df['Delay Reduction (s)'] = baseline_delay - df['Final Delay (s)']

print("\n" + "="*60)
print("PROGRESSIVE LEARNING SUMMARY - PROOF OF CONCEPT")
print("="*60)
print(f"\nBaseline (Fixed-Timing): {baseline_delay} seconds average delay")
print("\nDQN Agent Learning Progress:\n")
print(df.to_string(index=False))
print("\n" + "="*60)
print(f"FINAL RESULT: {df.iloc[-1]['Improvement (%)']:.1f}% improvement after 50 episodes")
print("="*60)

# Save summary to CSV
df.to_csv('progressive_learning_summary.csv', index=False)
print("\n✅ Saved: progressive_learning_summary.csv")
