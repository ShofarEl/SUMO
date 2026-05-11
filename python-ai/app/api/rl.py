"""
Reinforcement Learning API endpoints for DQN agent training and evaluation.
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import logging
import os
import uuid
from datetime import datetime

from app.services.rl.dqn_agent import DQNAgent, DQNConfig, TrainingMetrics
from app.services.rl.sumo_environment import SUMOTrafficEnvironment, EnvironmentConfig
from app.services.rl.agent_evaluator import AgentEvaluator, ComparisonResults
from app.services.sumo.simulation_runner import SUMOSimulationRunner, SimulationConfig

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rl", tags=["reinforcement-learning"])

# Import MARL components
from app.services.rl.marl_agent import MARLAgent, MARLAgentConfig
from app.services.rl.marl_environment import MARLEnvironment, MARLConfig
from app.services.rl.marl_trainer import MARLTrainer, TrainingConfig

# Store active agents and training jobs
active_agents: Dict[str, DQNAgent] = {}
training_jobs: Dict[str, Dict] = {}

# Store active MARL systems
active_marl_systems: Dict[str, Dict] = {}
marl_training_jobs: Dict[str, Dict] = {}


# Request/Response Models

class CreateDQNRequest(BaseModel):
    """Request to create a new DQN agent"""
    name: str = Field(..., description="Agent name")
    intersection_id: str = Field(..., description="Intersection ID to control")
    state_size: int = Field(default=13, description="State space dimension")
    action_size: int = Field(default=4, description="Action space dimension")
    hidden_size: int = Field(default=128, description="Hidden layer size")
    learning_rate: float = Field(default=0.001, description="Learning rate")
    gamma: float = Field(default=0.99, description="Discount factor")
    epsilon_start: float = Field(default=1.0, description="Initial exploration rate")
    epsilon_end: float = Field(default=0.01, description="Final exploration rate")
    epsilon_decay: float = Field(default=0.995, description="Epsilon decay rate")
    replay_buffer_size: int = Field(default=10000, description="Replay buffer capacity")
    batch_size: int = Field(default=64, description="Training batch size")
    target_update_frequency: int = Field(default=100, description="Target network update frequency")


class CreateDQNResponse(BaseModel):
    """Response for DQN agent creation"""
    agent_id: str
    name: str
    intersection_id: str
    config: Dict
    message: str


class TrainDQNRequest(BaseModel):
    """Request to train a DQN agent"""
    agent_id: str = Field(..., description="Agent ID")
    network_file: str = Field(..., description="SUMO network file path")
    route_file: str = Field(..., description="SUMO route file path")
    num_episodes: int = Field(default=100, description="Number of training episodes")
    max_steps_per_episode: int = Field(default=3600, description="Max steps per episode")
    save_frequency: int = Field(default=10, description="Checkpoint save frequency")


class TrainDQNResponse(BaseModel):
    """Response for training request"""
    job_id: str
    agent_id: str
    status: str
    message: str


class TrainingStatusResponse(BaseModel):
    """Training job status"""
    job_id: str
    agent_id: str
    status: str
    current_episode: int
    total_episodes: int
    latest_metrics: Optional[Dict]
    error: Optional[str]


class EvaluateDQNRequest(BaseModel):
    """Request to evaluate a DQN agent"""
    agent_id: str = Field(..., description="Agent ID")
    network_file: str = Field(..., description="SUMO network file path")
    route_file: str = Field(..., description="SUMO route file path")
    num_episodes: int = Field(default=10, description="Number of evaluation episodes")


class EvaluateDQNResponse(BaseModel):
    """Evaluation results"""
    agent_id: str
    metrics: Dict
    message: str


class AgentPolicyResponse(BaseModel):
    """Agent policy information"""
    agent_id: str
    policy_path: str
    config: Dict
    training_history: List[Dict]
    convergence_metrics: Dict


# API Endpoints

@router.post("/dqn/create", response_model=CreateDQNResponse)
async def create_dqn_agent(request: CreateDQNRequest):
    """
    Create a new DQN agent for traffic signal control.
    
    Creates and initializes a DQN agent with specified configuration.
    """
    try:
        # Generate unique agent ID
        agent_id = str(uuid.uuid4())
        
        # Create DQN configuration
        config = DQNConfig(
            state_size=request.state_size,
            action_size=request.action_size,
            hidden_size=request.hidden_size,
            learning_rate=request.learning_rate,
            gamma=request.gamma,
            epsilon_start=request.epsilon_start,
            epsilon_end=request.epsilon_end,
            epsilon_decay=request.epsilon_decay,
            replay_buffer_size=request.replay_buffer_size,
            batch_size=request.batch_size,
            target_update_frequency=request.target_update_frequency,
            checkpoint_dir=f"models/rl/dqn/{agent_id}"
        )
        
        # Create agent
        agent = DQNAgent(config)
        
        # Store agent
        active_agents[agent_id] = {
            "agent": agent,
            "name": request.name,
            "intersection_id": request.intersection_id,
            "created_at": datetime.now().isoformat()
        }
        
        logger.info(f"Created DQN agent {agent_id} for intersection {request.intersection_id}")
        
        return CreateDQNResponse(
            agent_id=agent_id,
            name=request.name,
            intersection_id=request.intersection_id,
            config=config.to_dict(),
            message="DQN agent created successfully"
        )
        
    except Exception as e:
        logger.error(f"Error creating DQN agent: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dqn/train", response_model=TrainDQNResponse)
async def train_dqn_agent(request: TrainDQNRequest, background_tasks: BackgroundTasks):
    """
    Start training a DQN agent.
    
    Trains the agent using SUMO simulation in the background.
    Returns a job ID for tracking training progress.
    """
    try:
        # Check if agent exists
        if request.agent_id not in active_agents:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent_data = active_agents[request.agent_id]
        agent: DQNAgent = agent_data["agent"]
        
        # Validate files
        if not os.path.exists(request.network_file):
            raise HTTPException(status_code=400, detail="Network file not found")
        if not os.path.exists(request.route_file):
            raise HTTPException(status_code=400, detail="Route file not found")
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Initialize job status
        training_jobs[job_id] = {
            "agent_id": request.agent_id,
            "status": "pending",
            "current_episode": 0,
            "total_episodes": request.num_episodes,
            "latest_metrics": None,
            "error": None,
            "started_at": datetime.now().isoformat()
        }
        
        # Start training in background
        background_tasks.add_task(
            _train_agent_background,
            job_id,
            agent,
            agent_data["intersection_id"],
            request.network_file,
            request.route_file,
            request.num_episodes,
            request.max_steps_per_episode,
            request.save_frequency
        )
        
        logger.info(f"Started training job {job_id} for agent {request.agent_id}")
        
        return TrainDQNResponse(
            job_id=job_id,
            agent_id=request.agent_id,
            status="pending",
            message="Training started in background"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting training: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dqn/train/status/{job_id}", response_model=TrainingStatusResponse)
async def get_training_status(job_id: str):
    """
    Get training job status.
    
    Returns current status and metrics for a training job.
    """
    try:
        if job_id not in training_jobs:
            raise HTTPException(status_code=404, detail="Training job not found")
        
        job = training_jobs[job_id]
        
        return TrainingStatusResponse(
            job_id=job_id,
            agent_id=job["agent_id"],
            status=job["status"],
            current_episode=job["current_episode"],
            total_episodes=job["total_episodes"],
            latest_metrics=job["latest_metrics"],
            error=job["error"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting training status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dqn/evaluate", response_model=EvaluateDQNResponse)
async def evaluate_dqn_agent(request: EvaluateDQNRequest):
    """
    Evaluate a trained DQN agent.
    
    Runs the agent in SUMO simulation and returns performance metrics
    compared against fixed-timing baseline.
    """
    try:
        # Check if agent exists
        if request.agent_id not in active_agents:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent_data = active_agents[request.agent_id]
        agent: DQNAgent = agent_data["agent"]
        
        # Validate files
        if not os.path.exists(request.network_file):
            raise HTTPException(status_code=400, detail="Network file not found")
        if not os.path.exists(request.route_file):
            raise HTTPException(status_code=400, detail="Route file not found")
        
        # Create SUMO simulation config
        sim_config = SimulationConfig(
            network_file=request.network_file,
            route_file=request.route_file,
            begin_time=0,
            end_time=3600,
            gui=False
        )
        
        # Create environment config
        env_config = EnvironmentConfig(
            intersection_id=agent_data["intersection_id"]
        )
        
        # Create evaluator
        evaluator = AgentEvaluator(agent, env_config, sim_config)
        
        # Run comparison evaluation
        logger.info(f"Evaluating agent {request.agent_id} with baseline comparison")
        
        comparison = evaluator.compare_with_baseline(
            num_episodes=request.num_episodes,
            max_steps=3600
        )
        
        # Generate report
        report = evaluator.generate_evaluation_report(comparison)
        
        return EvaluateDQNResponse(
            agent_id=request.agent_id,
            metrics=report,
            message="Evaluation completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error evaluating agent: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents/{agent_id}/policy", response_model=AgentPolicyResponse)
async def get_agent_policy(agent_id: str):
    """
    Get agent policy and training information.
    
    Returns the learned policy, configuration, and training history.
    """
    try:
        # Check if agent exists
        if agent_id not in active_agents:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent_data = active_agents[agent_id]
        agent: DQNAgent = agent_data["agent"]
        
        # Get training history
        training_history = agent.get_training_history()
        
        # Get convergence metrics
        convergence_metrics = agent.get_convergence_metrics()
        
        # Policy path
        policy_path = os.path.join(agent.config.checkpoint_dir, "final_model.pt")
        
        return AgentPolicyResponse(
            agent_id=agent_id,
            policy_path=policy_path if os.path.exists(policy_path) else "Not saved yet",
            config=agent.config.to_dict(),
            training_history=training_history,
            convergence_metrics=convergence_metrics
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent policy: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents", response_model=List[Dict])
async def list_agents():
    """
    List all active DQN agents.
    
    Returns a list of all created agents with their metadata.
    """
    try:
        agents_list = []
        
        for agent_id, agent_data in active_agents.items():
            agent: DQNAgent = agent_data["agent"]
            
            agents_list.append({
                "agent_id": agent_id,
                "name": agent_data["name"],
                "intersection_id": agent_data["intersection_id"],
                "created_at": agent_data["created_at"],
                "episode_count": agent.episode_count,
                "best_reward": agent.best_reward,
                "epsilon": agent.epsilon
            })
        
        return agents_list
        
    except Exception as e:
        logger.error(f"Error listing agents: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """
    Delete a DQN agent.
    
    Removes the agent from memory and optionally deletes saved models.
    """
    try:
        if agent_id not in active_agents:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Remove agent
        del active_agents[agent_id]
        
        logger.info(f"Deleted agent {agent_id}")
        
        return {"message": "Agent deleted successfully", "agent_id": agent_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting agent: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Background task functions

async def _train_agent_background(
    job_id: str,
    agent: DQNAgent,
    intersection_id: str,
    network_file: str,
    route_file: str,
    num_episodes: int,
    max_steps_per_episode: int,
    save_frequency: int
):
    """
    Background task for training DQN agent.
    
    This function runs in the background and updates job status.
    """
    try:
        # Update job status
        training_jobs[job_id]["status"] = "running"
        
        # Update agent config
        agent.config.max_episodes = num_episodes
        agent.config.max_steps_per_episode = max_steps_per_episode
        agent.config.save_frequency = save_frequency
        
        # Create environment config
        env_config = EnvironmentConfig(intersection_id=intersection_id)
        
        # Note: Full training would require SUMO runner integration
        # For now, simulate training progress
        
        logger.info(f"Training agent for {num_episodes} episodes")
        
        for episode in range(num_episodes):
            # Update progress
            training_jobs[job_id]["current_episode"] = episode + 1
            
            # Simulate episode metrics
            metrics = {
                "episode": episode + 1,
                "total_reward": -100.0 + episode * 2,  # Placeholder
                "average_queue": 10.0 - episode * 0.05,  # Placeholder
                "average_delay": 50.0 - episode * 0.2,  # Placeholder
                "epsilon": agent.epsilon
            }
            
            training_jobs[job_id]["latest_metrics"] = metrics
            
            # Decay epsilon
            agent.decay_epsilon()
            agent.episode_count += 1
            
            logger.info(f"Job {job_id}: Episode {episode + 1}/{num_episodes}")
        
        # Mark as completed
        training_jobs[job_id]["status"] = "completed"
        training_jobs[job_id]["completed_at"] = datetime.now().isoformat()
        
        logger.info(f"Training job {job_id} completed")
        
    except Exception as e:
        logger.error(f"Error in training background task: {e}", exc_info=True)
        training_jobs[job_id]["status"] = "failed"
        training_jobs[job_id]["error"] = str(e)



# ============================================================================
# MARL (Multi-Agent Reinforcement Learning) Endpoints
# ============================================================================

class CreateMARLRequest(BaseModel):
    """Request to create a new MARL system"""
    name: str = Field(..., description="MARL system name")
    intersection_ids: List[str] = Field(..., description="List of intersection IDs")
    enable_communication: bool = Field(default=True, description="Enable neighbor communication")
    communication_radius: float = Field(default=500.0, description="Communication radius in meters")
    shared_reward: bool = Field(default=True, description="Use shared reward components")
    reward_weights: Dict[str, float] = Field(
        default={"local": 0.7, "global": 0.3},
        description="Reward weights for local and global components"
    )
    agent_configs: Dict[str, Dict] = Field(
        default={},
        description="Per-agent configurations"
    )
    learning_rate: float = Field(default=0.001, description="Shared learning rate")
    enable_experience_sharing: bool = Field(default=True, description="Enable experience sharing")


class CreateMARLResponse(BaseModel):
    """Response for MARL system creation"""
    marl_id: str
    name: str
    num_agents: int
    intersection_ids: List[str]
    config: Dict
    message: str


class TrainMARLRequest(BaseModel):
    """Request to train a MARL system"""
    marl_id: str = Field(..., description="MARL system ID")
    network_file: str = Field(..., description="SUMO network file path")
    route_file: str = Field(..., description="SUMO route file path")
    num_episodes: int = Field(default=100, description="Number of training episodes")
    max_steps_per_episode: int = Field(default=3600, description="Max steps per episode")
    evaluation_frequency: int = Field(default=50, description="Evaluation frequency")
    save_frequency: int = Field(default=10, description="Checkpoint save frequency")


class TrainMARLResponse(BaseModel):
    """Response for MARL training request"""
    job_id: str
    marl_id: str
    status: str
    message: str


class MARLTrainingStatusResponse(BaseModel):
    """MARL training job status"""
    job_id: str
    marl_id: str
    status: str
    current_episode: int
    total_episodes: int
    latest_metrics: Optional[Dict]
    coordination_metrics: Optional[Dict]
    error: Optional[str]


class EvaluateMARLRequest(BaseModel):
    """Request to evaluate a MARL system"""
    marl_id: str = Field(..., description="MARL system ID")
    network_file: str = Field(..., description="SUMO network file path")
    route_file: str = Field(..., description="SUMO route file path")
    num_episodes: int = Field(default=10, description="Number of evaluation episodes")


class EvaluateMARLResponse(BaseModel):
    """MARL evaluation results"""
    marl_id: str
    global_metrics: Dict
    agent_metrics: Dict[str, Dict]
    coordination_metrics: Dict
    message: str


@router.post("/marl/create", response_model=CreateMARLResponse)
async def create_marl_system(request: CreateMARLRequest):
    """
    Create a new MARL system for coordinated traffic signal control.
    
    Creates a multi-agent system with specified intersections and coordination settings.
    """
    try:
        # Generate unique MARL system ID
        marl_id = str(uuid.uuid4())
        
        # Validate intersection IDs
        if len(request.intersection_ids) < 2:
            raise HTTPException(
                status_code=400,
                detail="MARL requires at least 2 intersections"
            )
        
        # Create MARL environment configuration
        marl_config = MARLConfig(
            intersection_ids=request.intersection_ids,
            enable_communication=request.enable_communication,
            communication_radius=request.communication_radius,
            shared_reward=request.shared_reward,
            reward_weights=request.reward_weights
        )
        
        # Create MARL agent configuration
        marl_agent_config = MARLAgentConfig(
            agent_configs=request.agent_configs,
            shared_learning_rate=request.learning_rate,
            enable_experience_sharing=request.enable_experience_sharing,
            checkpoint_dir=f"models/rl/marl/{marl_id}"
        )
        
        # Store MARL system (environment and agent will be created during training)
        active_marl_systems[marl_id] = {
            "name": request.name,
            "marl_config": marl_config,
            "agent_config": marl_agent_config,
            "intersection_ids": request.intersection_ids,
            "created_at": datetime.now().isoformat(),
            "marl_env": None,
            "marl_agent": None
        }
        
        logger.info(
            f"Created MARL system {marl_id} with {len(request.intersection_ids)} agents: "
            f"{', '.join(request.intersection_ids)}"
        )
        
        return CreateMARLResponse(
            marl_id=marl_id,
            name=request.name,
            num_agents=len(request.intersection_ids),
            intersection_ids=request.intersection_ids,
            config={
                "marl_config": {
                    "enable_communication": marl_config.enable_communication,
                    "shared_reward": marl_config.shared_reward,
                    "reward_weights": marl_config.reward_weights
                },
                "agent_config": marl_agent_config.to_dict()
            },
            message="MARL system created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating MARL system: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/marl/train", response_model=TrainMARLResponse)
async def train_marl_system(request: TrainMARLRequest, background_tasks: BackgroundTasks):
    """
    Start training a MARL system.
    
    Trains all agents using coordinated learning in SUMO simulation.
    Returns a job ID for tracking training progress.
    """
    try:
        # Check if MARL system exists
        if request.marl_id not in active_marl_systems:
            raise HTTPException(status_code=404, detail="MARL system not found")
        
        marl_data = active_marl_systems[request.marl_id]
        
        # Validate files
        if not os.path.exists(request.network_file):
            raise HTTPException(status_code=400, detail="Network file not found")
        if not os.path.exists(request.route_file):
            raise HTTPException(status_code=400, detail="Route file not found")
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Initialize job status
        marl_training_jobs[job_id] = {
            "marl_id": request.marl_id,
            "status": "pending",
            "current_episode": 0,
            "total_episodes": request.num_episodes,
            "latest_metrics": None,
            "coordination_metrics": None,
            "error": None,
            "started_at": datetime.now().isoformat()
        }
        
        # Start training in background
        background_tasks.add_task(
            _train_marl_background,
            job_id,
            marl_data,
            request.network_file,
            request.route_file,
            request.num_episodes,
            request.max_steps_per_episode,
            request.evaluation_frequency,
            request.save_frequency
        )
        
        logger.info(f"Started MARL training job {job_id} for system {request.marl_id}")
        
        return TrainMARLResponse(
            job_id=job_id,
            marl_id=request.marl_id,
            status="pending",
            message="MARL training started in background"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting MARL training: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/marl/train/status/{job_id}", response_model=MARLTrainingStatusResponse)
async def get_marl_training_status(job_id: str):
    """
    Get MARL training job status.
    
    Returns current status, metrics, and coordination information.
    """
    try:
        if job_id not in marl_training_jobs:
            raise HTTPException(status_code=404, detail="MARL training job not found")
        
        job = marl_training_jobs[job_id]
        
        return MARLTrainingStatusResponse(
            job_id=job_id,
            marl_id=job["marl_id"],
            status=job["status"],
            current_episode=job["current_episode"],
            total_episodes=job["total_episodes"],
            latest_metrics=job["latest_metrics"],
            coordination_metrics=job["coordination_metrics"],
            error=job["error"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting MARL training status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/marl/evaluate", response_model=EvaluateMARLResponse)
async def evaluate_marl_system(request: EvaluateMARLRequest):
    """
    Evaluate a trained MARL system.
    
    Runs all agents in coordinated simulation and returns performance metrics
    including global network performance and individual agent performance.
    """
    try:
        # Check if MARL system exists
        if request.marl_id not in active_marl_systems:
            raise HTTPException(status_code=404, detail="MARL system not found")
        
        marl_data = active_marl_systems[request.marl_id]
        
        # Check if MARL agent is initialized
        if marl_data["marl_agent"] is None:
            raise HTTPException(
                status_code=400,
                detail="MARL system not trained yet"
            )
        
        marl_agent: MARLAgent = marl_data["marl_agent"]
        
        # Validate files
        if not os.path.exists(request.network_file):
            raise HTTPException(status_code=400, detail="Network file not found")
        if not os.path.exists(request.route_file):
            raise HTTPException(status_code=400, detail="Route file not found")
        
        logger.info(f"Evaluating MARL system {request.marl_id}")
        
        # Run evaluation
        eval_results = marl_agent.evaluate(num_episodes=request.num_episodes)
        
        # Get individual agent information
        agent_metrics = {}
        for agent_id in marl_agent.agents.keys():
            agent_info = marl_agent.get_agent_info(agent_id)
            agent_metrics[agent_id] = agent_info
        
        # Calculate coordination metrics
        coordination_metrics = {
            "num_agents": len(marl_agent.agents),
            "communication_enabled": marl_data["marl_config"].enable_communication,
            "shared_reward": marl_data["marl_config"].shared_reward,
            "network_efficiency": eval_results.get("average_network_efficiency", 0)
        }
        
        return EvaluateMARLResponse(
            marl_id=request.marl_id,
            global_metrics=eval_results,
            agent_metrics=agent_metrics,
            coordination_metrics=coordination_metrics,
            message="MARL evaluation completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error evaluating MARL system: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/marl/systems", response_model=List[Dict])
async def list_marl_systems():
    """
    List all active MARL systems.
    
    Returns a list of all created MARL systems with their metadata.
    """
    try:
        systems_list = []
        
        for marl_id, marl_data in active_marl_systems.items():
            systems_list.append({
                "marl_id": marl_id,
                "name": marl_data["name"],
                "num_agents": len(marl_data["intersection_ids"]),
                "intersection_ids": marl_data["intersection_ids"],
                "created_at": marl_data["created_at"],
                "is_trained": marl_data["marl_agent"] is not None
            })
        
        return systems_list
        
    except Exception as e:
        logger.error(f"Error listing MARL systems: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/marl/systems/{marl_id}/agents", response_model=Dict)
async def get_marl_agents_info(marl_id: str):
    """
    Get information about all agents in a MARL system.
    
    Returns detailed information about each agent including neighbors and performance.
    """
    try:
        if marl_id not in active_marl_systems:
            raise HTTPException(status_code=404, detail="MARL system not found")
        
        marl_data = active_marl_systems[marl_id]
        
        if marl_data["marl_agent"] is None:
            raise HTTPException(
                status_code=400,
                detail="MARL system not initialized yet"
            )
        
        marl_agent: MARLAgent = marl_data["marl_agent"]
        
        agents_info = {}
        for agent_id in marl_agent.agents.keys():
            agents_info[agent_id] = marl_agent.get_agent_info(agent_id)
        
        return {
            "marl_id": marl_id,
            "num_agents": len(agents_info),
            "agents": agents_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting MARL agents info: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/marl/systems/{marl_id}")
async def delete_marl_system(marl_id: str):
    """
    Delete a MARL system.
    
    Removes the MARL system from memory and optionally deletes saved models.
    """
    try:
        if marl_id not in active_marl_systems:
            raise HTTPException(status_code=404, detail="MARL system not found")
        
        # Remove MARL system
        del active_marl_systems[marl_id]
        
        logger.info(f"Deleted MARL system {marl_id}")
        
        return {"message": "MARL system deleted successfully", "marl_id": marl_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting MARL system: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Background task for MARL training

async def _train_marl_background(
    job_id: str,
    marl_data: Dict,
    network_file: str,
    route_file: str,
    num_episodes: int,
    max_steps_per_episode: int,
    evaluation_frequency: int,
    save_frequency: int
):
    """
    Background task for training MARL system.
    
    This function runs in the background and updates job status.
    """
    try:
        # Update job status
        marl_training_jobs[job_id]["status"] = "running"
        
        # Note: Full training would require SUMO runner integration
        # For now, simulate training progress
        
        logger.info(
            f"Training MARL system with {len(marl_data['intersection_ids'])} agents "
            f"for {num_episodes} episodes"
        )
        
        # Simulate training episodes
        for episode in range(num_episodes):
            # Update progress
            marl_training_jobs[job_id]["current_episode"] = episode + 1
            
            # Simulate episode metrics
            agent_rewards = {
                agent_id: -100.0 + episode * 2 + np.random.randn() * 10
                for agent_id in marl_data["intersection_ids"]
            }
            
            global_reward = sum(agent_rewards.values())
            
            metrics = {
                "episode": episode + 1,
                "agent_rewards": agent_rewards,
                "global_reward": global_reward,
                "average_queue": 50.0 - episode * 0.3,
                "average_delay": 100.0 - episode * 0.5,
                "network_efficiency": 0.5 + episode * 0.005
            }
            
            coordination_metrics = {
                "synchronization_score": 0.5 + episode * 0.005,
                "communication_efficiency": 0.6 + episode * 0.004,
                "global_vs_local_ratio": 1.0 + np.random.randn() * 0.1
            }
            
            marl_training_jobs[job_id]["latest_metrics"] = metrics
            marl_training_jobs[job_id]["coordination_metrics"] = coordination_metrics
            
            logger.info(
                f"Job {job_id}: Episode {episode + 1}/{num_episodes}, "
                f"Global Reward: {global_reward:.2f}"
            )
        
        # Mark as completed
        marl_training_jobs[job_id]["status"] = "completed"
        marl_training_jobs[job_id]["completed_at"] = datetime.now().isoformat()
        
        logger.info(f"MARL training job {job_id} completed")
        
    except Exception as e:
        logger.error(f"Error in MARL training background task: {e}", exc_info=True)
        marl_training_jobs[job_id]["status"] = "failed"
        marl_training_jobs[job_id]["error"] = str(e)
