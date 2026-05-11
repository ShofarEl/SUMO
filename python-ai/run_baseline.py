"""
Run Baseline Simulation - Fixed timing traffic signals
This establishes the baseline performance to compare against DQN
"""
import os
import sys
import json
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.sumo.simulation_runner import SUMOSimulationRunner, SimulationConfig

def run_baseline_simulation():
    """Run baseline simulation with fixed timing"""
    
    print("=" * 60)
    print("BASELINE SIMULATION - Fixed Timing Signals")
    print("=" * 60)
    
    # Check if network files exist
    net_file = Path("demo_network/georgetown_demo.net.xml")
    rou_file = Path("demo_network/georgetown_demo.rou.xml")
    
    if not net_file.exists() or not rou_file.exists():
        print("❌ ERROR: Network files not found!")
        print("Please run: python quick_demo_setup.py first")
        return False
    
    print(f"✅ Network file: {net_file}")
    print(f"✅ Route file: {rou_file}")
    
    # Create simulation configuration
    config = SimulationConfig(
        network_file=str(net_file),
        route_file=str(rou_file),
        begin_time=0,
        end_time=3600,  # 1 hour simulation
        step_length=1.0,
        gui=False,  # No GUI for speed
        seed=42  # Fixed seed for reproducibility
    )
    
    print("\n📊 Starting baseline simulation...")
    print("   Duration: 1 hour (3600 seconds)")
    print("   Control: Fixed timing (60 second cycles)")
    print("   This will take 2-5 minutes...\n")
    
    try:
        # Create and run simulation
        runner = SUMOSimulationRunner(config)
        
        # Run simulation
        success = runner.run()
        
        if not success:
            print("❌ Simulation failed!")
            return False
        
        # Get summary statistics
        stats = runner.get_summary_statistics()
        
        print("\n" + "=" * 60)
        print("BASELINE RESULTS")
        print("=" * 60)
        print(f"Total Steps: {stats['total_steps']}")
        print(f"Simulation Duration: {stats['simulation_duration']:.1f} seconds")
        print(f"Total Departed: {stats['total_departed']} vehicles")
        print(f"Total Arrived: {stats['total_arrived']} vehicles")
        print(f"Total Teleported: {stats['total_teleported']} vehicles")
        print(f"\n📈 Performance Metrics:")
        print(f"   Average Vehicles: {stats['average_vehicles']:.2f}")
        print(f"   Average Speed: {stats['average_speed']:.2f} m/s")
        print(f"   Average Waiting Time: {stats['average_waiting_time']:.2f} seconds")
        print(f"   Average Delay per Vehicle: {stats['average_delay_per_vehicle']:.2f} seconds")
        print(f"   Total Delay: {stats['total_delay']:.2f} seconds")
        print(f"   Throughput: {stats['throughput_per_hour']:.2f} vehicles/hour")
        print("=" * 60)
        
        # Save results
        results_dir = Path("results")
        results_dir.mkdir(exist_ok=True)
        
        results_file = results_dir / "baseline_results.json"
        with open(results_file, 'w') as f:
            json.dump(stats, f, indent=2)
        
        print(f"\n✅ Results saved to: {results_file}")
        
        # Save metrics history
        metrics_file = results_dir / "baseline_metrics_history.json"
        metrics_history = [m.to_dict() for m in runner.metrics_history]
        with open(metrics_file, 'w') as f:
            json.dump(metrics_history, f, indent=2)
        
        print(f"✅ Metrics history saved to: {metrics_file}")
        
        print("\n" + "=" * 60)
        print("✅ BASELINE COMPLETE!")
        print("=" * 60)
        print("\nNext step: python train_dqn_fast.py")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_baseline_simulation()
    sys.exit(0 if success else 1)
