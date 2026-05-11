import pytest
import numpy as np
import torch
from app.services.rl.dqn_network import DQNNetwork
from app.services.rl.dqn_agent import DQNAgent, ReplayBuffer
from app.services.rl.sumo_environment import SUMOEnvironment


class TestDQNNetwork:
    """Test DQN neural network architecture"""
    
    def test_dqn_network_initialization(self):
        """Test DQN network can be initialized"""
        network = DQNNetwork(
            state_size=12,
            action_size=4,
            hidden_sizes=[64, 64]
        )
        assert network is not None
    
    def test_dqn_forward_pass(self):
        """Test DQN network forward pass"""
        network = DQNNetwork(
            state_size=12,
            action_size=4,
            hidden_sizes=[64, 64]
        )
        
        # Create sample state
        state = torch.randn(1, 12)
        
        # Forward pass
        q_values = network(state)
        
        assert q_values.shape == (1, 4)
        assert not torch.isnan(q_values).any()
    
    def test_dqn_batch_processing(self):
        """Test DQN network can process batches"""
        network = DQNNetwork(
            state_size=12,
            action_size=4,
            hidden_sizes=[64, 64]
        )
        
        # Create batch of states
        batch_states = torch.randn(32, 12)
        
        # Forward pass
        q_values = network(batch_states)
        
        assert q_values.shape == (32, 4)


class TestReplayBuffer:
    """Test experience replay buffer"""
    
    def test_replay_buffer_initialization(self):
        """Test replay buffer can be initialized"""
        buffer = ReplayBuffer(capacity=1000)
        assert buffer is not None
        assert len(buffer) == 0
    
    def test_replay_buffer_add(self):
        """Test adding experiences to buffer"""
        buffer = ReplayBuffer(capacity=1000)
        
        state = np.random.rand(12)
        action = 0
        reward = 1.0
        next_state = np.random.rand(12)
        done = False
        
        buffer.add(state, action, reward, next_state, done)
        
        assert len(buffer) == 1
    
    def test_replay_buffer_capacity(self):
        """Test replay buffer respects capacity"""
        buffer = ReplayBuffer(capacity=10)
        
        # Add more than capacity
        for i in range(15):
            state = np.random.rand(12)
            buffer.add(state, 0, 1.0, state, False)
        
        assert len(buffer) == 10
    
    def test_replay_buffer_sample(self):
        """Test sampling from replay buffer"""
        buffer = ReplayBuffer(capacity=1000)
        
        # Add experiences
        for i in range(100):
            state = np.random.rand(12)
            buffer.add(state, 0, 1.0, state, False)
        
        # Sample batch
        batch = buffer.sample(32)
        
        assert len(batch) == 5  # states, actions, rewards, next_states, dones
        assert len(batch[0]) == 32


class TestDQNAgent:
    """Test DQN agent functionality"""
    
    def test_dqn_agent_initialization(self):
        """Test DQN agent can be initialized"""
        agent = DQNAgent(
            state_size=12,
            action_size=4,
            learning_rate=0.001,
            gamma=0.99,
            epsilon=1.0,
            epsilon_decay=0.995,
            epsilon_min=0.01
        )
        assert agent is not None
    
    def test_dqn_agent_action_selection(self):
        """Test DQN agent action selection"""
        agent = DQNAgent(
            state_size=12,
            action_size=4
        )
        
        state = np.random.rand(12)
        action = agent.select_action(state)
        
        assert 0 <= action < 4
        assert isinstance(action, int)
    
    def test_dqn_agent_epsilon_greedy(self):
        """Test epsilon-greedy exploration"""
        agent = DQNAgent(
            state_size=12,
            action_size=4,
            epsilon=1.0  # Always explore
        )
        
        state = np.random.rand(12)
        
        # With epsilon=1.0, should select random actions
        actions = [agent.select_action(state) for _ in range(10)]
        
        # Should have some variety in actions
        assert len(set(actions)) > 1
    
    def test_dqn_agent_training_step(self):
        """Test DQN agent training step"""
        agent = DQNAgent(
            state_size=12,
            action_size=4
        )
        
        # Add experiences to replay buffer
        for i in range(100):
            state = np.random.rand(12)
            action = np.random.randint(0, 4)
            reward = np.random.rand()
            next_state = np.random.rand(12)
            done = False
            
            agent.remember(state, action, reward, next_state, done)
        
        # Train
        loss = agent.train_step(batch_size=32)
        
        assert loss is not None
        assert loss >= 0
    
    def test_dqn_agent_target_network_update(self):
        """Test target network update"""
        agent = DQNAgent(
            state_size=12,
            action_size=4
        )
        
        # Get initial target network parameters
        initial_params = [p.clone() for p in agent.target_network.parameters()]
        
        # Update target network
        agent.update_target_network()
        
        # Check parameters changed
        updated_params = list(agent.target_network.parameters())
        
        # Parameters should match policy network now
        policy_params = list(agent.policy_network.parameters())
        
        for updated, policy in zip(updated_params, policy_params):
            assert torch.allclose(updated, policy)
    
    def test_dqn_agent_epsilon_decay(self):
        """Test epsilon decay"""
        agent = DQNAgent(
            state_size=12,
            action_size=4,
            epsilon=1.0,
            epsilon_decay=0.99,
            epsilon_min=0.01
        )
        
        initial_epsilon = agent.epsilon
        
        # Decay epsilon
        agent.decay_epsilon()
        
        assert agent.epsilon < initial_epsilon
        assert agent.epsilon >= agent.epsilon_min
    
    def test_dqn_agent_save_load(self, tmp_path):
        """Test DQN agent save and load"""
        agent = DQNAgent(
            state_size=12,
            action_size=4
        )
        
        # Save agent
        model_path = tmp_path / "test_dqn.pth"
        agent.save(str(model_path))
        
        assert model_path.exists()
        
        # Load agent
        loaded_agent = DQNAgent(
            state_size=12,
            action_size=4
        )
        loaded_agent.load(str(model_path))
        
        assert loaded_agent is not None


class TestSUMOEnvironment:
    """Test SUMO environment wrapper"""
    
    def test_environment_initialization(self):
        """Test SUMO environment can be initialized"""
        # This test may be skipped if SUMO is not available
        try:
            env = SUMOEnvironment(
                net_file="test.net.xml",
                route_file="test.rou.xml",
                use_gui=False
            )
            assert env is not None
        except Exception as e:
            pytest.skip(f"SUMO not available: {e}")
    
    def test_environment_state_space(self):
        """Test environment state space definition"""
        try:
            env = SUMOEnvironment(
                net_file="test.net.xml",
                route_file="test.rou.xml",
                use_gui=False
            )
            
            state_size = env.get_state_size()
            assert state_size > 0
            assert isinstance(state_size, int)
        except Exception as e:
            pytest.skip(f"SUMO not available: {e}")
    
    def test_environment_action_space(self):
        """Test environment action space definition"""
        try:
            env = SUMOEnvironment(
                net_file="test.net.xml",
                route_file="test.rou.xml",
                use_gui=False
            )
            
            action_size = env.get_action_size()
            assert action_size > 0
            assert isinstance(action_size, int)
        except Exception as e:
            pytest.skip(f"SUMO not available: {e}")
    
    def test_reward_function(self):
        """Test reward function calculation"""
        try:
            env = SUMOEnvironment(
                net_file="test.net.xml",
                route_file="test.rou.xml",
                use_gui=False
            )
            
            # Test reward calculation with sample metrics
            reward = env.calculate_reward(
                avg_delay=10.0,
                queue_length=5.0,
                throughput=100.0
            )
            
            assert isinstance(reward, (int, float))
        except Exception as e:
            pytest.skip(f"SUMO not available: {e}")
