"""
Train DQN Fast - Quick training for proof-of-concept
Trains for only 20 episodes to get results in 2-3 hours
"""
import os
import sys
import json
from pathlib import Path
import time

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.rl.dqn_agent import DQNAgent, DQNConfig
from app.services.rl.sumo_environment import SUMOTrafficEnvironment, EnvironmentConfig

def train_dqn_quick():
    """Train DQN agent quickly for proof-of-concept"""
    
    print("=" * 60)
    print("DQN TRAINING - Quick Proof-of-Concept")
    print("=" * 60)
    
    # Check if network files exist
    net_file = Path("demo_network/georgetown_demo.net.xml")
    rou_file = Path("demo_network/georgetown_demo.rou.xml")
    
    if not net_file.exists() or not rou_file.exists():
        print("❌ ERROR: Network files not found!")
        print("Please run: python quick_demo_setup.py first")
        return False
    
    # Check if baseline exists
    baseline_file = Path("results/baseline_results.json")
    if not baseline_file.exists():
        print("⚠️  WARNING: Baseline results not found!")
        print("Recommended: Run python run_baseline.py first")
        print("Continuing anyway...\n")
    
    print(f"✅ Network file: {net_file}")
    print(f"✅ Route file: {rou_file}")
    
    # Environment configuration - SHORT episodes for speed
    env_config = EnvironmentConfig(
        network_file=str(net_file),
        route_file=str(rou_file),
        num_seconds=900,  # Only 15 minutes per episode (not 1 hour)
        delta_time=5,  # Update every 5 seconds
        yellow_time=3,
        min_green=5,
        max_green=60,
        sumo_gui=False,
        sumo_seed=42
    )
    
    # DQN configuration - MINIMAL for speed
    dqn_config = DQNConfig(
        state_size=13,  # Standard state space
        action_size=4,  # 4 signal phases
        hidden_size=64,  # Smaller network = faster training
        learning_rate=0.001,
        gamma=0.99,
        epsilon_start=1.0,
        epsilon_end=0.1,
        epsilon_decay=0.95,  # Faster decay
        replay_buffer_size=5000,  # Smaller buffer
        batch_size=32,  # Smaller batches
        min_replay_size=500,  # Start training sooner
        target_update_frequency=50,  # Update more frequently
        max_episodes=20,  # ONLY 20 EPISODES
        max_steps_per_episode=180,  # 15 min / 5 sec = 180 steps
        save_frequency=10,
        checkpoint_dir="results/checkpoints"
    )
    
    print("\n📊 Training Configuration:")
    print(f"   Episodes: {dqn_config.max_episodes}")
    print(f"   Steps per episode: {dqn_config.max_steps_per_episode}")
    print(f"   Episode duration: {env_config.num_seconds} seconds")
    print(f"   Hidden layer size: {dqn_config.hidden_size}")
    print(f"   Batch size: {dqn_config.batch_size}")
    print(f"\n⏱️  Estimated time: 2-3 hours")
    print(f"   (Each episode takes ~6-10 minutes)")
    
    input("\nPress ENTER to start training (or Ctrl+C to cancel)...")
    
    try:
        # Create environment
        print("\n🔧 Creating SUMO environment...")
        env = SUMOTrafficEnvironment(env_config)
        
        # Create agent
        print("🔧 Creating DQN agent...")
        agent = DQNAgent(dqn_config, device='cpu')  # Use CPU (change to 'cuda' if you have GPU)
        
        print(f"🔧 Using device: {agent.device}")
        
        # Training callback to show progress
        def training_callback(metrics):
            print(f"\n📊 Episode {metrics.episode}/{dqn_config.max_episodes}")
            print(f"   Reward: {metrics.total_reward:.2f}")
            print(f"   Avg Delay: {metrics.average_delay:.2f} seconds")
            print(f"   Avg Queue: {metrics.average_queue:.2f} vehicles")
            print(f"   Epsilon: {metrics.epsilon:.3f}")
            print(f"   Loss: {metrics.loss:.4f}")
            print(f"   Steps: {metrics.steps}")
        
        # Start training
        print("\n" + "=" * 60)
        print("🚀 STARTING TRAINING")
        print("=" * 60)
        print("This will take 2-3 hours. You can monitor progress above.")
        print("Training will save checkpoints every 10 episodes.")
        print("=" * 60 + "\n")
        
        start_time = time.time()
        
        # Train
        metrics = agent.train(env, num_episodes=dqn_config.max_episodes, callback=training_callback)
        
        end_time = time.time()
        training_duration = end_time - start_time
        
        # Save final model
        print("\n💾 Saving final model...")
        agent.save_checkpoint("dqn_georgetown_final.pt")
        agent.save_policy("results/dqn_georgetown_policy.pt")
        
        # Save training history
        results_dir = Path("results")
        results_dir.mkdir(exist_ok=True)
        
        training_file = results_dir / "training_results.json"
        training_history = agent.get_training_history()
        with open(training_file, 'w') as f:
            json.dump(training_history, f, indent=2)
        
        print(f"✅ Training history saved to: {training_file}")
        
        # Get convergence metrics
        convergence = agent.get_convergence_metrics()
        
        # Print summary
        print("\n" + "=" * 60)
        print("✅ TRAINING COMPLETE!")
        print("=" * 60)
        print(f"Training Duration: {training_duration/3600:.2f} hours")
        print(f"Total Episodes: {convergence['total_episodes']}")
        print(f"Best Reward: {convergence['best_reward']:.2f}")
        print(f"Final Reward: {convergence['final_reward']:.2f}")
        print(f"Avg Reward (last 10): {convergence['average_reward_last_10']:.2f}")
        print("=" * 60)
        
        # Compare with baseline if available
        if baseline_file.exists():
            with open(baseline_file) as f:
                baseline = json.load(f)
            
            baseline_delay = baseline['average_delay_per_vehicle']
            final_delay = metrics[-1].average_delay
            delay_reduction = ((baseline_delay - final_delay) / baseline_delay) * 100
            
            baseline_queue = baseline['average_vehicles']
            final_queue = metrics[-1].average_queue
            queue_reduction = ((baseline_queue - final_queue) / baseline_queue) * 100
            
            print("\n📊 PERFORMANCE COMPARISON:")
            print(f"   Baseline Delay: {baseline_delay:.2f} seconds")
            print(f"   DQN Delay: {final_delay:.2f} seconds")
            print(f"   ✅ Delay Reduction: {delay_reduction:.1f}%")
            print(f"\n   Baseline Queue: {baseline_queue:.2f} vehicles")
            print(f"   DQN Queue: {final_queue:.2f} vehicles")
            print(f"   ✅ Queue Reduction: {queue_reduction:.1f}%")
            print("=" * 60)
        
        print("\nNext step: python generate_results.py")
        print("=" * 60)
        
        return True
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Training interrupted by user!")
        print("Partial results may be saved in results/checkpoints/")
        return False
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = train_dqn_quick()
    sys.exit(0 if success else 1)
