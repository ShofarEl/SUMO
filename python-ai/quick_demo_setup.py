"""
Quick Demo Setup - Creates a simple traffic network for fast testing
This uses SUMO's built-in example or creates a minimal network
"""
import os
import sys
from pathlib import Path

def setup_demo_network():
    """Set up a simple demo network for quick testing"""
    
    print("=" * 60)
    print("QUICK DEMO SETUP")
    print("=" * 60)
    
    # Check if SUMO is installed
    sumo_home = os.environ.get('SUMO_HOME')
    if not sumo_home:
        print("❌ ERROR: SUMO_HOME environment variable not set!")
        print("Please install SUMO and set SUMO_HOME")
        print("Download from: https://sumo.dlr.de/docs/Downloads.php")
        return False
    
    print(f"✅ SUMO_HOME found: {sumo_home}")
    
    # Option 1: Try to use SUMO example network
    example_net = Path(sumo_home) / "data" / "examples" / "grid" / "grid.net.xml"
    example_rou = Path(sumo_home) / "data" / "examples" / "grid" / "grid.rou.xml"
    
    demo_dir = Path("demo_network")
    demo_dir.mkdir(exist_ok=True)
    
    if example_net.exists() and example_rou.exists():
        print(f"\n✅ Found SUMO example network")
        print(f"   Network: {example_net}")
        print(f"   Routes: {example_rou}")
        
        # Copy to demo directory
        import shutil
        shutil.copy(example_net, demo_dir / "georgetown_demo.net.xml")
        shutil.copy(example_rou, demo_dir / "georgetown_demo.rou.xml")
        
        print(f"\n✅ Copied to demo_network/")
        print(f"   - georgetown_demo.net.xml")
        print(f"   - georgetown_demo.rou.xml")
        
        return True
    
    else:
        print(f"\n⚠️  SUMO example network not found at expected location")
        print(f"   Expected: {example_net}")
        print(f"\n📝 Creating minimal network manually...")
        
        # Create minimal network XML
        create_minimal_network(demo_dir)
        return True


def create_minimal_network(demo_dir):
    """Create a minimal 4-way intersection network"""
    
    # Minimal network file
    net_xml = """<?xml version="1.0" encoding="UTF-8"?>
<net version="1.20" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/net_file.xsd">
    <location netOffset="0.00,0.00" convBoundary="0.00,0.00,200.00,200.00" origBoundary="0.00,0.00,200.00,200.00" projParameter="!"/>
    
    <edge id="E0" from="J0" to="J1" priority="-1">
        <lane id="E0_0" index="0" speed="13.89" length="100.00" shape="0.00,98.40 100.00,98.40"/>
    </edge>
    <edge id="E1" from="J1" to="J2" priority="-1">
        <lane id="E1_0" index="0" speed="13.89" length="100.00" shape="101.60,100.00 101.60,200.00"/>
    </edge>
    <edge id="E2" from="J2" to="J3" priority="-1">
        <lane id="E2_0" index="0" speed="13.89" length="100.00" shape="200.00,101.60 100.00,101.60"/>
    </edge>
    <edge id="E3" from="J3" to="J0" priority="-1">
        <lane id="E3_0" index="0" speed="13.89" length="100.00" shape="98.40,0.00 98.40,100.00"/>
    </edge>
    
    <junction id="J0" type="priority" x="0.00" y="100.00" incLanes="E3_0" intLanes="" shape="0.00,100.00 0.00,96.80 100.00,96.80 100.00,100.00"/>
    <junction id="J1" type="priority" x="100.00" y="100.00" incLanes="E0_0" intLanes="" shape="100.00,100.00 103.20,100.00 103.20,200.00 100.00,200.00"/>
    <junction id="J2" type="priority" x="200.00" y="100.00" incLanes="E1_0" intLanes="" shape="200.00,100.00 200.00,103.20 100.00,103.20 100.00,100.00"/>
    <junction id="J3" type="priority" x="100.00" y="0.00" incLanes="E2_0" intLanes="" shape="100.00,0.00 96.80,0.00 96.80,100.00 100.00,100.00"/>
</net>
"""
    
    # Minimal route file
    rou_xml = """<?xml version="1.0" encoding="UTF-8"?>
<routes xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/routes_file.xsd">
    <vType id="car" accel="2.6" decel="4.5" sigma="0.5" length="5" minGap="2.5" maxSpeed="50" guiShape="passenger"/>
    
    <route id="route0" edges="E0 E1"/>
    <route id="route1" edges="E1 E2"/>
    <route id="route2" edges="E2 E3"/>
    <route id="route3" edges="E3 E0"/>
    
    <flow id="flow0" type="car" route="route0" begin="0" end="3600" probability="0.1"/>
    <flow id="flow1" type="car" route="route1" begin="0" end="3600" probability="0.1"/>
    <flow id="flow2" type="car" route="route2" begin="0" end="3600" probability="0.1"/>
    <flow id="flow3" type="car" route="route3" begin="0" end="3600" probability="0.1"/>
</routes>
"""
    
    # Write files
    (demo_dir / "georgetown_demo.net.xml").write_text(net_xml)
    (demo_dir / "georgetown_demo.rou.xml").write_text(rou_xml)
    
    print(f"✅ Created minimal network:")
    print(f"   - {demo_dir}/georgetown_demo.net.xml")
    print(f"   - {demo_dir}/georgetown_demo.rou.xml")


if __name__ == "__main__":
    success = setup_demo_network()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ SETUP COMPLETE!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Run baseline: python run_baseline.py")
        print("2. Train DQN: python train_dqn_fast.py")
        print("3. Generate results: python generate_results.py")
        print("=" * 60)
    else:
        print("\n❌ Setup failed. Please fix errors above.")
        sys.exit(1)
